
// supabase/functions/alerts-process/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Tipo de evento que pode ser detectado
type EventType = 'fall_detection' | 'motion' | 'person' | 'anomaly';

// Função para processar a imagem e detectar eventos
async function processImage(imageBuffer: ArrayBuffer): Promise<{
  type: EventType;
  confidence: number;
  details?: Record<string, any>;
}> {
  // Aqui você chamaria uma API de IA para analisar a imagem
  // Por exemplo, TensorFlow, Azure Cognitive Services, AWS Rekognition, etc.
  
  // Simulação de detecção para demonstração
  const eventTypes: EventType[] = ['fall_detection', 'motion', 'person', 'anomaly'];
  const selectedType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const confidence = 0.5 + (Math.random() * 0.5); // Valor entre 0.5 e 1.0
  
  // Simular um tempo de processamento realista
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    type: selectedType,
    confidence,
    details: {
      processingTime: 300,
      modelVersion: '1.0.0'
    }
  };
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
        type: detectionResult.type,
        confidence: detectionResult.confidence,
        timestamp: timestamp || new Date().toISOString(),
        details: detectionResult.details,
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
    
    // Se for um evento crítico (quedas com alta confiança), envia notificação
    if (detectionResult.type === 'fall_detection' && detectionResult.confidence > 0.8) {
      // Registrar alerta e disparar notificações
      await supabaseAdmin
        .from('alerts')
        .insert({
          event_id: eventData[0].id,
          user_id: cameraData.user_id,
          camera_id,
          type: 'emergency',
          message: 'Possível queda detectada!',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
      // Aqui você implementaria o envio de notificações (SMS, push, etc)
      // Isso poderia chamar outras Edge Functions específicas para cada tipo de notificação
    }
    
    // Retornar evento criado
    return new Response(
      JSON.stringify(eventData[0]),
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
