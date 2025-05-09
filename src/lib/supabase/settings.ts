
import { supabase } from './client';
import type { UserSettings } from './types';

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
