
import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getProfile, updateProfile } from '@/lib/supabase';
import type { Profile, EmergencyContact } from '@/lib/supabase';
import { profileSchema, type ProfileFormValues } from '@/lib/validation/profileSchema';
import PersonalInfoForm from '@/components/profile/PersonalInfoForm';
import EmergencyContactsForm from '@/components/profile/EmergencyContactsForm';

// Type predicate para validar se um objeto é um EmergencyContact válido
function isValidEmergencyContact(contact: any): contact is EmergencyContact {
  return typeof contact.name === 'string' && 
         typeof contact.relationship === 'string' && 
         typeof contact.phone === 'string';
}

const ProfilePage = () => {
  const { toast } = useToast();
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  
  const methods = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
      emergencyContacts: [
        { name: '', relationship: '', phone: '' }
      ]
    },
    mode: "onChange"
  });

  const { handleSubmit, reset, formState: { isSubmitting } } = methods;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await getProfile();
        if (profileData) {
          // Save email separately as it's read-only
          setUserEmail(profileData.email || '');
          
          // Reset form with profile data, garantindo tipos corretos
          reset({
            name: profileData.name || '',
            phone: profileData.phone || '',
            emergencyContacts: profileData.emergency_contacts && profileData.emergency_contacts.length > 0
              ? profileData.emergency_contacts
                  .filter(isValidEmergencyContact)
                  .map(contact => ({
                    name: contact.name,
                    relationship: contact.relationship,
                    phone: contact.phone
                  }))
              : [{ name: '', relationship: '', phone: '' }]
          });
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do perfil.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [toast, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateProfile({
        name: data.name,
        phone: data.phone,
        emergencyContacts: data.emergencyContacts
      });
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar suas informações.",
        variant: "destructive"
      });
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-safewatch-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold mb-6 text-safewatch-text">Meu Perfil</h1>
      
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <PersonalInfoForm email={userEmail} />
          <EmergencyContactsForm />
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="bg-safewatch-primary hover:bg-safewatch-accent"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default ProfilePage;
