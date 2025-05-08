
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getProfile, updateProfile } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';
import PersonalInfoForm from '@/components/profile/PersonalInfoForm';
import EmergencyContactsForm from '@/components/profile/EmergencyContactsForm';

const ProfilePage = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    emergencyContacts: [
      { name: '', relationship: '', phone: '' },
      { name: '', relationship: '', phone: '' }
    ]
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await getProfile();
        if (profileData) {
          setFormData(prev => ({
            ...prev,
            name: profileData.name || '',
            email: profileData.email || '',
            phone: profileData.phone || ''
          }));
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
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (index: number, field: string, value: string) => {
    const updatedContacts = [...formData.emergencyContacts];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    setFormData(prev => ({ ...prev, emergencyContacts: updatedContacts }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, { name: '', relationship: '', phone: '' }]
    }));
  };

  const removeContact = (index: number) => {
    const updatedContacts = [...formData.emergencyContacts];
    updatedContacts.splice(index, 1);
    setFormData(prev => ({ ...prev, emergencyContacts: updatedContacts }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile({
        name: formData.name,
        phone: formData.phone
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
    } finally {
      setIsLoading(false);
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
      
      <form onSubmit={handleSubmit}>
        <PersonalInfoForm 
          name={formData.name}
          email={formData.email}
          phone={formData.phone}
          onInputChange={handleInputChange}
        />
        
        <EmergencyContactsForm
          contacts={formData.emergencyContacts}
          onContactChange={handleContactChange}
          onAddContact={addContact}
          onRemoveContact={removeContact}
        />
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="bg-safewatch-primary hover:bg-safewatch-accent"
            disabled={isLoading}
          >
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
