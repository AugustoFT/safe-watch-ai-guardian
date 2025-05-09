
// Worker that processes the queue_frames table
const { createClient } = require('@supabase/supabase-js');

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALERTS_PROCESS_ENDPOINT = `${SUPABASE_URL}/functions/v1/alerts-process`;
const BATCH_SIZE = 10; // Processar 10 frames por vez
const POLLING_INTERVAL = 60000; // 1 minuto entre polling

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
    .limit(BATCH_SIZE);

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
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
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

// Versão com Realtime Subscription
async function startRealtimeSubscription() {
  console.log('Iniciando assinatura Realtime para queue_frames...');
  
  const subscription = supabase
    .channel('table-db-changes')
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'queue_frames',
        filter: 'processed=eq.false'
      }, 
      (payload) => {
        console.log('Novo frame detectado via Realtime:', payload.new.id);
        
        // Processar o novo frame imediatamente
        fetch(ALERTS_PROCESS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({
            camera_id: payload.new.camera_id,
            frame_url: payload.new.frame_url,
            timestamp: payload.new.timestamp,
            queue_id: payload.new.id
          })
        })
        .then(response => {
          if (!response.ok) {
            return response.json().then(data => {
              throw new Error(`API retornou erro ${response.status}: ${JSON.stringify(data)}`);
            });
          }
          return response.json();
        })
        .then(result => {
          console.log(`Frame ${payload.new.id} processado via Realtime, evento ${result.id} criado`);
        })
        .catch(error => {
          console.error(`Erro ao processar frame ${payload.new.id} via Realtime:`, error);
          
          // Marcar como erro para não tentar processar novamente
          supabase
            .from('queue_frames')
            .update({
              processed: true,
              error: error.message,
              processed_at: new Date().toISOString()
            })
            .eq('id', payload.new.id)
            .then(() => console.log(`Frame ${payload.new.id} marcado como erro`))
            .catch(err => console.error(`Erro ao marcar frame ${payload.new.id} como erro:`, err));
        });
      }
    )
    .subscribe();
    
  return subscription;
}

/**
 * Função principal do worker
 */
async function main() {
  console.log('Iniciando worker de processamento de fila...');
  
  // Processar itens pendentes primeiro
  await processQueueItems();
  
  // Iniciar assinatura Realtime para novos itens
  const subscription = await startRealtimeSubscription();
  
  // Também fazer polling periódico para garantir que nenhum item seja perdido
  // isso é útil em caso de falhas na conexão Realtime
  const intervalId = setInterval(processQueueItems, POLLING_INTERVAL);
  
  // Tratar encerramento gracioso
  process.on('SIGINT', async () => {
    console.log('Encerrando worker...');
    clearInterval(intervalId);
    await subscription.unsubscribe();
    process.exit(0);
  });
  
  console.log(`Worker iniciado. Realtime ativo e polling a cada ${POLLING_INTERVAL/1000} segundos.`);
}

// Execução como um script independente
if (require.main === module) {
  main().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

// Export para uso como módulo
module.exports = {
  processQueueItems,
  startRealtimeSubscription
};
