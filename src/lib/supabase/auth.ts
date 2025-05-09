
import { supabase } from './client';

// Funções de autenticação
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

export async function register({ name, email, password, phone }: { 
  name: string;
  email: string;
  password: string;
  phone: string;
}) {
  try {
    // Registra o usuário com email/senha
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Falha no registro: usuário não criado');

    // Insere os dados adicionais na tabela profiles
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      name,
      email,
      phone,
      created_at: new Date().toISOString(),
    });

    if (profileError) throw profileError;

    return {
      user: authData.user,
      session: authData.session
    };
  } catch (error) {
    console.error('Error during registration:', error);
    throw error;
  }
}

export async function login({ email, password }: {
  email: string;
  password: string;
}) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
}
