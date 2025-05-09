
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Configurações
const PORT = process.env.PORT || 3001;
const HLS_OUTPUT_DIR = process.env.HLS_OUTPUT_DIR || './hls-streams';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.STREAMING_SECRET_KEY;

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || !JWT_SECRET) {
  console.error('Variáveis de ambiente VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY e STREAMING_SECRET_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configurar Express
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Servir arquivos HLS estáticos
app.use('/streams', express.static(HLS_OUTPUT_DIR));

// Armazenar processos ativos de streaming
const activeStreams = new Map();

// Middleware para verificar token JWT
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido ou inválido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Converter RTSP para HLS
app.post('/convert', verifyToken, async (req, res) => {
  try {
    const { rtsp_url, camera_id } = req.body;
    
    if (!rtsp_url || !camera_id) {
      return res.status(400).json({ error: 'rtsp_url e camera_id são obrigatórios' });
    }

    // Verificar se a câmera pertence ao usuário
    const { data: cameraData, error: cameraError } = await supabase
      .from('cameras')
      .select('*')
      .eq('id', camera_id)
      .eq('user_id', req.user.sub)
      .single();

    if (cameraError || !cameraData) {
      return res.status(404).json({ error: 'Câmera não encontrada ou sem permissão' });
    }

    // Criar diretório para o stream HLS se não existir
    const streamId = randomUUID();
    const userId = req.user.sub;
    const outputDir = path.join(HLS_OUTPUT_DIR, userId, camera_id, streamId);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Configurar comando FFmpeg
    const ffmpegArgs = [
      '-i', rtsp_url,                     // Input RTSP stream
      '-c:v', 'libx264',                  // Video codec
      '-c:a', 'aac',                      // Audio codec
      '-ac', '1',                         // Audio channels
      '-ar', '44100',                     // Audio sample rate
      '-b:a', '96k',                      // Audio bitrate
      '-vf', 'scale=640:-1',              // Scale video
      '-g', '30',                         // Group of pictures (GOP)
      '-sc_threshold', '0',               // Scene change threshold
      '-hls_time', '2',                   // Segment duration
      '-hls_list_size', '10',             // Number of segments in playlist
      '-hls_flags', 'delete_segments',    // Auto delete old segments
      '-hls_segment_type', 'mpegts',      // Segment format
      '-start_number', '0',               // Start segment number
      '-f', 'hls',                        // Format HLS
      path.join(outputDir, 'index.m3u8')  // Output file
    ];

    // Iniciar processo FFmpeg
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
    
    // Registrar stream ativo
    activeStreams.set(streamId, {
      userId,
      cameraId: camera_id,
      process: ffmpegProcess,
      createdAt: new Date(),
      outputDir
    });

    // Tratar logs do ffmpeg (opcional)
    ffmpegProcess.stderr.on('data', (data) => {
      console.log(`[FFmpeg] ${data.toString()}`);
    });

    ffmpegProcess.on('error', (error) => {
      console.error(`Erro ao iniciar FFmpeg: ${error.message}`);
      res.status(500).json({ error: 'Erro ao iniciar o streaming' });
      cleanupStream(streamId);
    });

    // Verificar se o processo iniciou corretamente
    const checkStartTimeout = setTimeout(() => {
      if (fs.existsSync(path.join(outputDir, 'index.m3u8'))) {
        // Stream iniciado, gerar URL de streaming com token expirável
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + 3600); // Expira em 1 hora
        
        const streamToken = jwt.sign(
          { 
            stream: streamId, 
            user: userId, 
            camera: camera_id,
            exp: Math.floor(expiresAt.getTime() / 1000)
          },
          JWT_SECRET
        );
        
        // Construir URL HLS
        const hlsUrl = `${BASE_URL}/streams/${userId}/${camera_id}/${streamId}/index.m3u8?token=${streamToken}`;

        // Atualizar status da câmera para online
        supabase
          .from('cameras')
          .update({
            status: 'online',
            last_connected: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', camera_id)
          .then(() => console.log(`Câmera ${camera_id} está online`))
          .catch(err => console.error(`Erro ao atualizar status da câmera: ${err.message}`));
        
        res.json({
          stream_url: hlsUrl,
          stream_id: streamId,
          expires_at: expiresAt.toISOString()
        });
      } else {
        res.status(500).json({ error: 'Falha ao iniciar o streaming' });
        cleanupStream(streamId);
      }
    }, 5000); // Esperar 5 segundos para o stream iniciar

    // Limpar o timeout se o processo terminar antes
    ffmpegProcess.on('close', (code) => {
      clearTimeout(checkStartTimeout);
      if (!res.headersSent) {
        res.status(500).json({ error: `FFmpeg encerrou com código ${code}` });
      }
      cleanupStream(streamId);
    });
  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para parar um stream
app.delete('/stream/:streamId', verifyToken, (req, res) => {
  const { streamId } = req.params;
  const stream = activeStreams.get(streamId);
  
  if (!stream) {
    return res.status(404).json({ error: 'Stream não encontrado' });
  }
  
  // Verificar permissão
  if (stream.userId !== req.user.sub) {
    return res.status(403).json({ error: 'Sem permissão para encerrar este stream' });
  }
  
  cleanupStream(streamId);
  
  // Atualizar status da câmera para offline
  supabase
    .from('cameras')
    .update({
      status: 'offline',
      updated_at: new Date().toISOString()
    })
    .eq('id', stream.cameraId)
    .then(() => console.log(`Câmera ${stream.cameraId} está offline`))
    .catch(err => console.error(`Erro ao atualizar status da câmera: ${err.message}`));
  
  res.json({ success: true, message: 'Stream encerrado' });
});

// Middleware para verificar token de acesso ao stream
app.use('/streams/:userId/:cameraId/:streamId', (req, res, next) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(401).send('Acesso não autorizado: Token não fornecido');
    }
    
    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar se o token corresponde ao stream solicitado
    if (decoded.stream !== req.params.streamId || 
        decoded.user !== req.params.userId || 
        decoded.camera !== req.params.cameraId) {
      return res.status(403).send('Acesso não autorizado: Token inválido para este stream');
    }
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).send('Acesso não autorizado: Token expirado');
    }
    return res.status(403).send('Acesso não autorizado: Token inválido');
  }
});

// Função auxiliar para limpar um stream
function cleanupStream(streamId) {
  const stream = activeStreams.get(streamId);
  if (stream) {
    // Terminar processo FFmpeg
    if (stream.process && !stream.process.killed) {
      stream.process.kill('SIGTERM');
    }
    
    // Remover diretório (opcional - pode manter para acessos futuros)
    // fs.rmSync(stream.outputDir, { recursive: true, force: true });
    
    // Remover da lista de streams ativos
    activeStreams.delete(streamId);
    console.log(`Stream ${streamId} encerrado e limpo`);
  }
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor RTSP-to-HLS rodando na porta ${PORT}`);
  
  // Criar diretório base se não existir
  if (!fs.existsSync(HLS_OUTPUT_DIR)) {
    fs.mkdirSync(HLS_OUTPUT_DIR, { recursive: true });
  }
});

// Limpar todos os streams ativos ao encerrar
process.on('SIGINT', () => {
  console.log('Encerrando servidor e todos os streams ativos...');
  
  for (const streamId of activeStreams.keys()) {
    cleanupStream(streamId);
  }
  
  process.exit(0);
});
