
import { supabase } from './client';
import type { Camera } from './types';

export async function getCameras() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('cameras')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data as Camera[];
  } catch (error) {
    console.error('Error fetching cameras:', error);
    throw error;
  }
}

export async function getCamera(id: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('cameras')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    
    return data as Camera;
  } catch (error) {
    console.error('Error fetching camera:', error);
    throw error;
  }
}

export async function addCamera(camera: Omit<Camera, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('cameras')
      .insert({
        ...camera,
        user_id: user.id,
        created_at: new Date().toISOString(),
        status: 'offline' // Status inicial
      })
      .select();

    if (error) throw error;
    
    return data[0] as Camera;
  } catch (error) {
    console.error('Error adding camera:', error);
    throw error;
  }
}

export async function updateCamera(id: string, camera: Partial<Camera>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('cameras')
      .update({
        ...camera,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select();

    if (error) throw error;
    
    return data[0] as Camera;
  } catch (error) {
    console.error('Error updating camera:', error);
    throw error;
  }
}

export async function deleteCamera(id: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('cameras')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting camera:', error);
    throw error;
  }
}
