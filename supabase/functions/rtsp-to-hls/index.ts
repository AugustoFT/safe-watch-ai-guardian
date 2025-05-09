
// supabase/functions/rtsp-to-hls/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Função que irá gerar uma URL assinada para streaming HLS
// Na prática, isso chamaria um serviço que faz a conversão RTSP->HLS em tempo real
const generateStreamUrl = async (rtspUrl: string, userId: string, cameraId: string) => {
  // Aqui você implementaria a chamada ao seu serviço de streaming
  // Por exemplo, um servidor Node.js com FFmpeg ou um serviço dedicado de streaming
  
  // Simulação de uma URL de streaming HLS para demonstração
  const baseStreamingUrl = "https://streaming.yourdomain.com";
  const streamKey = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + 60); // Expira em 60 segundos
  
  const hlsUrl = `${baseStreamingUrl}/${userId}/${cameraId}/${streamKey}/index.m3u8`;
  
  return {
    hlsUrl,
    expiresAt,
    streamKey
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
    const { camera_id, rtsp_url } = await req.json();
    
    if (!camera_id || !rtsp_url) {
      return new Response(
        JSON.stringify({ error: 'camera_id e rtsp_url são obrigatórios' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Verificar se a câmera pertence ao usuário
    const { data: cameraData, error: cameraError } = await supabaseClient
      .from('cameras')
      .select('*')
      .eq('id', camera_id)
      .eq('user_id', user.id)
      .single();
    
    if (cameraError || !cameraData) {
      return new Response(
        JSON.stringify({ error: 'Câmera não encontrada ou sem permissão' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Gerar URL de streaming HLS
    const streamData = await generateStreamUrl(rtsp_url, user.id, camera_id);
    
    // Retornar URL e dados de expiração
    return new Response(
      JSON.stringify({ 
        stream_url: streamData.hlsUrl,
        expires_at: streamData.expiresAt.toISOString(),
        stream_key: streamData.streamKey
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
