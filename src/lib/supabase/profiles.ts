
import { supabase } from './client';
import type { Profile, EmergencyContact } from './types';

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
