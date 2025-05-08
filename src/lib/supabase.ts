
import { createClient } from '@supabase/supabase-js';

// Importando as variáveis de ambiente usando import.meta.env
const supabaseUrl = 'https://eynzgkbifvfsnjdtiayv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bnpna2JpZnZmc25qZHRpYXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2Njk2NjQsImV4cCI6MjA2MjI0NTY2NH0.jc9XuPof8Spr1chGGltryoa1-whxxY1t82YiCepfiro';

// Verificação para garantir que as variáveis estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at?: string;
}

export async function getProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function updateProfile({ name, phone }: { name: string, phone: string }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('profiles')
      .update({ name, phone, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
}
