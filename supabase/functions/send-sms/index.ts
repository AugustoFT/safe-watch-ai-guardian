
// supabase/functions/send-sms/index.ts
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
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado', details: userError }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Ler os dados do corpo da requisição
    const { to, message, eventId } = await req.json();
    
    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'to e message são obrigatórios' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Configurações do Twilio (em produção, usar variáveis de ambiente)
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
    
    // Preparar e enviar SMS usando a API do Twilio
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const twilioParams = new URLSearchParams();
    twilioParams.append('To', to);
    twilioParams.append('From', TWILIO_PHONE_NUMBER);
    twilioParams.append('Body', message);
    
    const twilioResponse = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      },
      body: twilioParams,
    });
    
    const twilioData = await twilioResponse.json();
    
    // Verificar se o Twilio conseguiu enviar a mensagem
    if (!twilioResponse.ok || twilioData.error_code) {
      throw new Error(`Twilio error: ${twilioData.error_message || 'Unknown error'}`);
    }
    
    // Registrar o alerta enviado
    const { data: alertData, error: alertError } = await supabaseAdmin
      .from('alerts')
      .insert({
        user_id: user.id,
        event_id: eventId,
        type: 'sms',
        recipient: to,
        message: message,
        status: 'sent',
        external_id: twilioData.sid,
        created_at: new Date().toISOString()
      })
      .select();
      
    if (alertError) {
      console.error('Erro ao registrar alerta:', alertError);
      // Não falha a requisição, já que o SMS foi enviado com sucesso
    }
    
    // Retornar sucesso
    return new Response(
      JSON.stringify({ 
        success: true, 
        message_sid: twilioData.sid,
        alert_id: alertData ? alertData[0].id : null
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao enviar SMS:', error);
    
    return new Response(
      JSON.stringify({ error: 'Erro ao enviar SMS', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
