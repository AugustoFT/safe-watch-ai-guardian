
// supabase/functions/send-push/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @deno-types="https://cdn.jsdelivr.net/npm/firebase-admin@11.10.1/lib/app/firebase-app.d.ts"
import { initializeApp, cert, getApps } from 'https://cdn.jsdelivr.net/npm/firebase-admin@11.10.1/lib/index.js'

// Inicializar o Firebase Admin
function initFirebaseApp() {
  if (getApps().length === 0) {
    // Parse das credenciais (as chaves privadas vêm como string)
    const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    
    const app = initializeApp({
      credential: cert({
        projectId: Deno.env.get('FIREBASE_PROJECT_ID'),
        clientEmail: Deno.env.get('FIREBASE_CLIENT_EMAIL'),
        privateKey
      })
    });
    
    return app;
  } else {
    return getApps()[0];
  }
}

// Validar se as configurações do Firebase estão presentes
function validateFirebaseConfig() {
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(
    varName => !Deno.env.get(varName)
  );
  
  if (missingVars.length > 0) {
    throw new Error(`Configuração do Firebase incompleta. Variáveis ausentes: ${missingVars.join(', ')}`);
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
    
    // Criar um cliente Supabase
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token não fornecido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );
    
    // Cliente admin para operações privilegiadas
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Verificar autenticação do usuário
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    // Se não estiver sendo chamado com token de serviço, verifica usuário
    if (!authHeader.includes('service_role') && (userError || !user)) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado', details: userError }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Ler os dados do corpo da requisição
    const { userId, title, body, data, deviceToken, alertId } = await req.json();
    
    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'title e body são obrigatórios' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Se foi fornecido userId mas não deviceToken, buscar tokens do usuário
    let tokens: string[] = [];
    if (deviceToken) {
      tokens = [deviceToken];
    } else if (userId) {
      // Em um cenário real, aqui você buscaria os tokens FCM do usuário
      // de uma tabela de device_tokens no Supabase
      
      // Simulação - em produção, busque da tabela device_tokens
      const { data: tokensData, error: tokensError } = await supabaseAdmin
        .from('device_tokens')
        .select('token')
        .eq('user_id', userId);
        
      if (!tokensError && tokensData?.length > 0) {
        tokens = tokensData.map(t => t.token);
      }
    }
    
    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum token de dispositivo encontrado' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Validar e inicializar Firebase
    validateFirebaseConfig();
    const firebaseApp = initFirebaseApp();
    
    // Preparar a mensagem para FCM
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens
    };
    
    // Enviar a notificação via FCM
    const messaging = firebaseApp.messaging();
    const response = await messaging.sendMulticast(message);
    
    // Registrar o alerta enviado
    const targetUserId = userId || user?.id;
    if (targetUserId) {
      const alertPromises = tokens.map(async (token, index) => {
        const success = response.responses[index]?.success || false;
        
        return await supabaseAdmin
          .from('alerts')
          .insert({
            id: alertId ? `${alertId}_${index}` : undefined,
            user_id: targetUserId,
            event_id: data?.eventId,
            type: 'push',
            recipient: token,
            message: `${title}: ${body}`,
            status: success ? 'sent' : 'failed',
            external_id: response.responses[index]?.messageId || null,
            sent_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
      });
      
      await Promise.all(alertPromises);
    }
    
    // Retornar resultado
    return new Response(
      JSON.stringify({ 
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao enviar notificação push:', error);
    
    return new Response(
      JSON.stringify({ error: 'Erro ao enviar notificação push', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
