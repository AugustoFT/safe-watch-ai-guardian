
// Simulação de um worker que processaria a fila de frames
// Isso poderia ser um AWS Lambda, Vercel Cron, ou outro serverless worker

const { createClient } = require('@supabase/supabase-js');

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALERTS_PROCESS_ENDPOINT = process.env.ALERTS_PROCESS_ENDPOINT; // URL da Edge Function

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
}

// Cliente Supabase com permissões de serviço
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Processa os itens pendentes na fila
 */
async function processQueueItems() {
  console.log('Iniciando processamento da fila...');

  // Buscar frames não processados (limitado a um lote por vez)
  const { data: queueItems, error } = await supabase
    .from('queue_frames')
    .select('*')
    .eq('processed', false)
    .order('timestamp', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Erro ao buscar itens da fila:', error);
    return;
  }

  if (!queueItems || queueItems.length === 0) {
    console.log('Nenhum item encontrado para processamento');
    return;
  }

  console.log(`Encontrados ${queueItems.length} frames para processamento`);

  // Processar cada item da fila
  for (const item of queueItems) {
    try {
      console.log(`Processando frame ${item.id} da câmera ${item.camera_id}`);
      
      // Chamar a Edge Function para processar o frame
      const response = await fetch(ALERTS_PROCESS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Em produção, usar autenticação JWT ou chave de API
        },
        body: JSON.stringify({
          camera_id: item.camera_id,
          frame_url: item.frame_url,
          timestamp: item.timestamp,
          queue_id: item.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API retornou erro ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      console.log(`Frame ${item.id} processado, evento ${result.id} criado`);
      
      // Note: a Edge Function já atualiza o item na fila como processado
      
    } catch (error) {
      console.error(`Erro ao processar frame ${item.id}:`, error);
      
      // Marcar como erro para não tentar processar novamente
      await supabase
        .from('queue_frames')
        .update({
          processed: true,
          error: error.message,
          processed_at: new Date().toISOString()
        })
        .eq('id', item.id);
    }
  }

  console.log('Lote de processamento concluído');
}

// Execução como um script independente
if (require.main === module) {
  processQueueItems()
    .then(() => {
      console.log('Processamento concluído');
      process.exit(0);
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}

// Export para uso como módulo
exports.processQueueItems = processQueueItems;
