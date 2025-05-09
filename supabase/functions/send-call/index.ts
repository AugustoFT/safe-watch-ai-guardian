
// supabase/functions/send-call/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { to, message, eventId, alertId } = await req.json();
    
    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'to e message são obrigatórios' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Configurações do Twilio
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(
        JSON.stringify({ error: 'Configuração do Twilio incompleta' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Criar TwiML para a chamada telefônica
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="woman" language="pt-BR">${message}</Say>
      <Pause length="1"/>
      <Say voice="woman" language="pt-BR">Esta é uma mensagem automatizada do SafeWatch. ${message}</Say>
      <Pause length="1"/>
      <Say voice="woman" language="pt-BR">Por favor, verifique o aplicativo para mais detalhes.</Say>
    </Response>`;
    
    // Preparar e iniciar chamada usando a API do Twilio
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    
    const twilioParams = new URLSearchParams();
    twilioParams.append('To', to);
    twilioParams.append('From', TWILIO_PHONE_NUMBER);
    twilioParams.append('Twiml', twiml);
    
    const twilioResponse = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      },
      body: twilioParams,
    });
    
    const twilioData = await twilioResponse.json();
    
    // Verificar se o Twilio conseguiu iniciar a chamada
    if (!twilioResponse.ok || twilioData.error_code) {
      throw new Error(`Twilio error: ${twilioData.error_message || 'Unknown error'}`);
    }
    
    // Determinar o user_id para o registro do alerta
    let userId = user?.id;
    
    // Se não tiver user_id da autenticação mas estiver sendo chamado por outro serviço
    if (!userId && eventId) {
      // Buscar user_id do evento relacionado
      const { data: eventData } = await supabaseAdmin
        .from('events')
        .select('user_id')
        .eq('id', eventId)
        .single();
        
      userId = eventData?.user_id;
    }
    
    // Registrar o alerta enviado
    const { data: alertData, error: alertError } = await supabaseAdmin
      .from('alerts')
      .upsert({
        id: alertId || undefined, // Se já tiver ID, atualiza
        user_id: userId,
        event_id: eventId,
        type: 'call',
        recipient: to,
        message: message,
        status: 'initiated', // Status inicial da chamada
        external_id: twilioData.sid,
        sent_at: new Date().toISOString(),
        created_at: alertId ? undefined : new Date().toISOString() // Só define se for novo
      })
      .select();
      
    if (alertError) {
      console.error('Erro ao registrar alerta:', alertError);
      // Não falha a requisição, já que a chamada foi iniciada com sucesso
    }
    
    // Retornar sucesso
    return new Response(
      JSON.stringify({ 
        success: true, 
        call_sid: twilioData.sid,
        alert_id: alertData ? alertData[0].id : alertId
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao iniciar chamada:', error);
    
    return new Response(
      JSON.stringify({ error: 'Erro ao iniciar chamada', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
