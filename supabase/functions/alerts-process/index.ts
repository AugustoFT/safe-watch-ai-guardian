
// supabase/functions/alerts-process/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Tipo de evento que pode ser detectado
type EventType = 'fall_detection' | 'motion' | 'person' | 'anomaly';

// Interface para resultado da detecção
interface DetectionResult {
  type: EventType;
  confidence: number;
  details?: Record<string, any>;
  bounding_boxes?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    confidence: number;
  }>;
}

// Função para processar a imagem e detectar eventos
async function processImage(imageBuffer: ArrayBuffer): Promise<DetectionResult> {
  try {
    // Para uma implementação real, aqui você chamaria uma API de IA
    // Por exemplo, usando TensorFlow.js, Microsoft Azure Computer Vision, AWS Rekognition, etc.
    
    // Esta é uma implementação simulada
    // Em produção, use um modelo real de detecção
    await new Promise(resolve => setTimeout(resolve, 300)); // Simular tempo de processamento
    
    const eventTypes: EventType[] = ['fall_detection', 'motion', 'person', 'anomaly'];
    const selectedType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const confidence = 0.5 + (Math.random() * 0.5); // Valor entre 0.5 e 1.0
    
    return {
      type: selectedType,
      confidence,
      details: {
        processingTime: 300,
        modelVersion: '1.0.0'
      },
      bounding_boxes: selectedType === 'person' ? [
        {
          x: 120,
          y: 80,
          width: 200,
          height: 350,
          label: 'person',
          confidence: 0.95
        }
      ] : []
    };
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    throw error;
  }
}

// Handle HTTP requests
serve(async (req) => {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Criar cliente Supabase com serviço admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Obter dados do corpo da requisição
    const { camera_id, frame_url, timestamp, queue_id } = await req.json();
    
    if (!camera_id || !frame_url) {
      return new Response(
        JSON.stringify({ error: 'camera_id e frame_url são obrigatórios' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Obter dados da câmera
    const { data: cameraData, error: cameraError } = await supabaseAdmin
      .from('cameras')
      .select('*')
      .eq('id', camera_id)
      .single();
    
    if (cameraError || !cameraData) {
      return new Response(
        JSON.stringify({ error: 'Câmera não encontrada', details: cameraError }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Extrair o nome do arquivo da URL
    const fileName = frame_url.split('/').pop();
    
    // Fazer download da imagem
    const { data: fileData, error: fileError } = await supabaseAdmin
      .storage
      .from('frames')
      .download(`cameras/${camera_id}/${fileName}`);
      
    if (fileError || !fileData) {
      return new Response(
        JSON.stringify({ error: 'Falha ao baixar imagem', details: fileError }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Processar a imagem com IA
    const detectionResult = await processImage(await fileData.arrayBuffer());
    
    // Registrar evento detectado
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from('events')
      .insert({
        camera_id,
        user_id: cameraData.user_id,
        type: detectionResult.type,
        confidence: detectionResult.confidence,
        frame_url,
        details: {
          ...detectionResult.details,
          bounding_boxes: detectionResult.bounding_boxes || []
        },
        timestamp: timestamp || new Date().toISOString(),
      })
      .select();
      
    if (eventError) {
      return new Response(
        JSON.stringify({ error: 'Falha ao registrar evento', details: eventError }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Se foi informado o ID da fila, marca como processado
    if (queue_id) {
      await supabaseAdmin
        .from('queue_frames')
        .update({
          processed: true,
          event_id: eventData[0].id,
          processed_at: new Date().toISOString()
        })
        .eq('id', queue_id);
    }
    
    // Obter configurações do usuário
    const { data: userSettings } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', cameraData.user_id)
      .single();
    
    // Verificar se deve enviar alerta com base na configuração de sensibilidade
    let shouldSendAlert = false;
    let alertType = 'info';
    
    if (detectionResult.type === 'fall_detection' && 
        userSettings?.fall_detection_sensitivity &&
        detectionResult.confidence * 100 >= userSettings.fall_detection_sensitivity) {
      shouldSendAlert = true;
      alertType = 'emergency';
    } else if (detectionResult.type === 'person') {
      shouldSendAlert = true;
      alertType = 'warning';
    } else if (detectionResult.type === 'motion' &&
              userSettings?.motion_detection_sensitivity &&
              detectionResult.confidence * 100 >= userSettings.motion_detection_sensitivity) {
      shouldSendAlert = true;
      alertType = 'info';
    }
    
    // Se for um evento crítico, envia notificação
    if (shouldSendAlert) {
      // Registrar alerta
      const { data: alertData } = await supabaseAdmin
        .from('alerts')
        .insert({
          event_id: eventData[0].id,
          user_id: cameraData.user_id,
          type: alertType,
          message: `${detectionResult.type === 'fall_detection' ? 'Possível queda' : 
                    detectionResult.type === 'person' ? 'Pessoa detectada' : 
                    'Movimento detectado'} em ${cameraData.name} (${cameraData.location})`,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select();
      
      // Enviar notificações se configurado
      if (alertType === 'emergency' && userSettings?.sms_enabled) {
        // Buscar contatos de emergência
        const { data: contacts } = await supabaseAdmin
          .from('emergency_contacts')
          .select('*')
          .eq('profile_id', cameraData.user_id);
          
        if (contacts && contacts.length > 0) {
          // Chamar send-sms edge function para cada contato
          const alertMessage = `ALERTA: Possível queda detectada em ${cameraData.name} (${cameraData.location}). Verifique imediatamente.`;
          
          try {
            for (const contact of contacts) {
              await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                  to: contact.phone,
                  message: alertMessage,
                  eventId: eventData[0].id,
                  alertId: alertData ? alertData[0].id : null
                })
              });
            }
          } catch (error) {
            console.error('Erro ao enviar SMS:', error);
          }
        }
      }
      
      if (userSettings?.push_enabled) {
        // Chamar send-push edge function
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              userId: cameraData.user_id,
              title: `${alertType === 'emergency' ? '🚨 EMERGÊNCIA' : 
                      alertType === 'warning' ? '⚠️ Alerta' : 'ℹ️ Informação'}`,
              body: `${detectionResult.type === 'fall_detection' ? 'Possível queda' : 
                    detectionResult.type === 'person' ? 'Pessoa detectada' : 
                    'Movimento detectado'} em ${cameraData.name} (${cameraData.location})`,
              data: {
                eventId: eventData[0].id,
                cameraId: camera_id,
                frameUrl: frame_url
              }
            })
          });
        } catch (error) {
          console.error('Erro ao enviar notificação push:', error);
        }
      }
    }
    
    // Retornar evento criado
    return new Response(
      JSON.stringify({
        id: eventData[0].id,
        type: detectionResult.type,
        confidence: detectionResult.confidence,
        alert_sent: shouldSendAlert,
        details: detectionResult.details
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao processar frame:', error);
    
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
