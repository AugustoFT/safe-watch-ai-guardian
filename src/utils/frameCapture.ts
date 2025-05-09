
import { supabase } from '@/lib/supabase';

/**
 * Captura um frame da câmera e o enfileira para processamento
 * @param cameraId ID da câmera
 * @param streamUrl URL do stream HLS
 * @returns Resultado da operação
 */
export async function captureAndEnqueueFrame(cameraId: string, streamUrl: string): Promise<boolean> {
  try {
    // Em um cenário real, aqui você faria:
    // 1. Capturar um frame do video usando canvas ou uma API de servidor
    // 2. Converter o frame para um arquivo de imagem (ex: JPEG)
    // 3. Fazer upload para o storage do Supabase
    // 4. Inserir na fila queue_frames
    
    // Simulação do processo
    console.log(`Capturando frame da câmera ${cameraId}, stream ${streamUrl}`);
    
    // Simular captura de frame (em produção você usaria canvas ou WebRTC)
    const frameData = await simulateFrameCapture(streamUrl);
    
    // Gerar nome único para o arquivo
    const fileName = `${cameraId}_${Date.now()}.jpg`;
    
    // Upload do frame para o Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('frames')
      .upload(`cameras/${cameraId}/${fileName}`, frameData, {
        contentType: 'image/jpeg'
      });
      
    if (uploadError) throw uploadError;
    
    // Obter URL pública do frame
    const { data: urlData } = await supabase
      .storage
      .from('frames')
      .getPublicUrl(`cameras/${cameraId}/${fileName}`);
      
    if (!urlData?.publicUrl) throw new Error('Falha ao obter URL pública do frame');
    
    // Inserir registro na tabela queue_frames
    const { error: insertError } = await supabase
      .from('queue_frames')
      .insert({
        camera_id: cameraId,
        frame_url: urlData.publicUrl,
        timestamp: new Date().toISOString(),
        processed: false
      });
      
    if (insertError) throw insertError;
    
    return true;
  } catch (error) {
    console.error('Erro ao capturar e enfileirar frame:', error);
    return false;
  }
}

/**
 * Função auxiliar para simular a captura de um frame
 * Em produção, isso seria substituído por canvas.toBlob() ou outra API real
 */
async function simulateFrameCapture(streamUrl: string): Promise<Blob> {
  // Simulação - apenas retorna um blob vazio
  // Em produção, isso capturaria um frame real do stream
  return new Blob([''], { type: 'image/jpeg' });
}

/**
 * Agenda a captura de frames periódicos para uma câmera
 * @param cameraId ID da câmera
 * @param streamUrl URL do stream HLS
 * @param intervalSeconds Intervalo entre capturas em segundos
 * @returns ID do intervalo para poder cancelar depois
 */
export function scheduleFrameCapture(
  cameraId: string, 
  streamUrl: string, 
  intervalSeconds: number = 60
): number {
  console.log(`Agendando captura de frames para câmera ${cameraId} a cada ${intervalSeconds} segundos`);
  
  // Agenda a execução periódica
  const intervalId = setInterval(() => {
    captureAndEnqueueFrame(cameraId, streamUrl)
      .then(success => {
        if (!success) {
          console.error(`Falha ao capturar frame para câmera ${cameraId}`);
        }
      });
  }, intervalSeconds * 1000);
  
  return intervalId;
}

/**
 * Para a captura programada de frames
 * @param intervalId ID do intervalo retornado por scheduleFrameCapture
 */
export function stopFrameCapture(intervalId: number): void {
  clearInterval(intervalId);
}
