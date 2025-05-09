
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Re-exportar o cliente supabase para manter a compatibilidade com código existente
export { supabase };

// Tipos
export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
  emergency_contacts?: EmergencyContact[];
}

export type EmergencyContact = {
  id?: string;
  profile_id?: string;
  name: string;
  relationship: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
}

export type Camera = {
  id?: string;
  user_id?: string;
  name: string;
  location: string;
  rtsp_url: string;
  description?: string;
  status?: 'online' | 'offline' | 'error';
  created_at?: string;
  updated_at?: string;
}

export type UserSettings = {
  id?: string;
  user_id: string;
  subscription_plan?: string;
  sms_enabled: boolean;
  call_enabled: boolean;
  push_enabled: boolean;
  cloud_storage_enabled: boolean;
  retention_days: number;
  fall_detection_sensitivity: number;
  heart_rate_detection_sensitivity: number;
  motion_detection_sensitivity: number;
  created_at?: string;
  updated_at?: string;
  device_token?: string;
  notification_threshold?: number;
}

// Funções para perfil
export async function getProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    
    // Buscar contatos de emergência
    const { data: contactsData, error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('profile_id', user.id);
      
    if (contactsError) throw contactsError;
    
    const profile: Profile = {
      ...profileData,
      emergency_contacts: contactsData || []
    };
    
    return profile;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function updateProfile({ 
  name, 
  phone, 
  emergencyContacts 
}: { 
  name: string;
  phone: string;
  emergencyContacts: EmergencyContact[];
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    // Atualizar o perfil
    const { data, error } = await supabase
      .from('profiles')
      .update({ name, phone, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select();

    if (error) throw error;
    
    // Deletar contatos existentes para substituir pelos novos
    const { error: deleteError } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('profile_id', user.id);
      
    if (deleteError) throw deleteError;
    
    // Inserir os novos contatos
    if (emergencyContacts && emergencyContacts.length > 0) {
      const contactsWithProfileId = emergencyContacts.map(contact => ({
        ...contact,
        profile_id: user.id,
        created_at: new Date().toISOString()
      }));
      
      const { error: insertError } = await supabase
        .from('emergency_contacts')
        .insert(contactsWithProfileId);
        
      if (insertError) throw insertError;
    }
    
    return { ...data[0], emergency_contacts: emergencyContacts };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

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

// Funções para câmeras
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

// Funções para configurações do usuário
export async function getUserSettings() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Nenhum resultado encontrado
        // Criar configurações padrão se não existirem
        return createDefaultUserSettings();
      }
      throw error;
    }
    
    // Converter o resultado da API para o tipo UserSettings
    const settings: UserSettings = {
      ...data,
      cloud_storage_enabled: data.cloud_storage_enabled ?? true,
      retention_days: data.retention_days ?? 30,
      fall_detection_sensitivity: data.fall_detection_sensitivity ?? 70,
      heart_rate_detection_sensitivity: data.heart_rate_detection_sensitivity ?? 60,
      motion_detection_sensitivity: data.motion_detection_sensitivity ?? 50,
    };
    
    return settings;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    throw error;
  }
}

export async function createDefaultUserSettings() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const defaultSettings: Omit<UserSettings, 'id'> = {
      user_id: user.id,
      subscription_plan: 'basic',
      sms_enabled: false,
      call_enabled: false,
      push_enabled: true,
      cloud_storage_enabled: true,
      retention_days: 30,
      fall_detection_sensitivity: 70,
      heart_rate_detection_sensitivity: 60,
      motion_detection_sensitivity: 50,
    };

    const { data, error } = await supabase
      .from('user_settings')
      .insert(defaultSettings)
      .select();

    if (error) throw error;
    
    // Converter o resultado da API para o tipo UserSettings
    const settings: UserSettings = {
      ...data[0],
      cloud_storage_enabled: data[0].cloud_storage_enabled ?? true,
      retention_days: data[0].retention_days ?? 30,
      fall_detection_sensitivity: data[0].fall_detection_sensitivity ?? 70,
      heart_rate_detection_sensitivity: data[0].heart_rate_detection_sensitivity ?? 60,
      motion_detection_sensitivity: data[0].motion_detection_sensitivity ?? 50,
    };
    
    return settings;
  } catch (error) {
    console.error('Error creating default user settings:', error);
    throw error;
  }
}

export async function updateUserSettings(settings: Partial<UserSettings>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    // Verificar se as configurações já existem
    const { data: existingData, error: fetchError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existingData) {
      // Atualizar configurações existentes
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id)
        .select();

      if (error) throw error;
      
      // Converter o resultado da API para o tipo UserSettings
      const updatedSettings: UserSettings = {
        ...data[0],
        cloud_storage_enabled: data[0].cloud_storage_enabled ?? true,
        retention_days: data[0].retention_days ?? 30,
        fall_detection_sensitivity: data[0].fall_detection_sensitivity ?? 70,
        heart_rate_detection_sensitivity: data[0].heart_rate_detection_sensitivity ?? 60,
        motion_detection_sensitivity: data[0].motion_detection_sensitivity ?? 50,
      };
      
      return updatedSettings;
    } else {
      // Criar novas configurações
      const newSettings = {
        user_id: user.id,
        subscription_plan: 'basic',
        sms_enabled: false,
        call_enabled: false,
        push_enabled: true,
        cloud_storage_enabled: true,
        retention_days: 30,
        fall_detection_sensitivity: 70,
        heart_rate_detection_sensitivity: 60,
        motion_detection_sensitivity: 50,
        ...settings,
      };

      const { data, error } = await supabase
        .from('user_settings')
        .insert(newSettings)
        .select();

      if (error) throw error;
      
      // Converter o resultado da API para o tipo UserSettings
      const createdSettings: UserSettings = {
        ...data[0],
        cloud_storage_enabled: data[0].cloud_storage_enabled ?? true,
        retention_days: data[0].retention_days ?? 30,
        fall_detection_sensitivity: data[0].fall_detection_sensitivity ?? 70,
        heart_rate_detection_sensitivity: data[0].heart_rate_detection_sensitivity ?? 60,
        motion_detection_sensitivity: data[0].motion_detection_sensitivity ?? 50,
      };
      
      return createdSettings;
    }
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
}
