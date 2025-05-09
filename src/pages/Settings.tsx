
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getUserSettings, updateUserSettings, type UserSettings } from '@/lib/supabase';

const Settings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<UserSettings>({
    user_id: '',
    subscription_plan: 'basic',
    sms_enabled: false,
    call_enabled: false,
    push_enabled: true,
    cloud_storage_enabled: true,
    retention_days: 30,
    fall_detection_sensitivity: 70,
    heart_rate_detection_sensitivity: 60,
    motion_detection_sensitivity: 50,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const userSettings = await getUserSettings();
        if (userSettings) {
          setSettings(userSettings);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar suas configurações.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  const handleToggleChange = (field: keyof UserSettings) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev],
    }));
  };

  const handleSliderChange = (field: keyof UserSettings, value: number[]) => {
    setSettings(prev => ({
      ...prev,
      [field]: value[0],
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateUserSettings(settings);
      toast({
        title: "Configurações salvas",
        description: "Suas preferências foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar suas configurações.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 text-safewatch-text">Configurações</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-safewatch-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-safewatch-text">Configurações</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Plano de Assinatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">
                  Plano {settings.subscription_plan === 'premium' ? 'Premium' : 'Básico'}
                </h3>
                <p className="text-sm text-safewatch-muted">
                  {settings.subscription_plan === 'premium' 
                    ? 'Monitoramento avançado com todas as funcionalidades.' 
                    : 'Monitoramento básico com recursos limitados.'}
                </p>
              </div>
              <Button variant="outline">Alterar Plano</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Serviços Automatizados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Mensagens de Texto (SMS)</h3>
                <p className="text-sm text-safewatch-muted">
                  Enviar SMS automáticos em caso de emergências.
                </p>
              </div>
              <Switch
                checked={settings.sms_enabled}
                onCheckedChange={() => handleToggleChange('sms_enabled')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Ligações Telefônicas Automáticas</h3>
                <p className="text-sm text-safewatch-muted">
                  Realizar chamadas automáticas para contatos de emergência.
                </p>
              </div>
              <Switch
                checked={settings.call_enabled}
                onCheckedChange={() => handleToggleChange('call_enabled')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Notificações Push</h3>
                <p className="text-sm text-safewatch-muted">
                  Receber alertas no dispositivo móvel.
                </p>
              </div>
              <Switch
                checked={settings.push_enabled}
                onCheckedChange={() => handleToggleChange('push_enabled')}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Armazenamento em Nuvem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Ativar Armazenamento em Nuvem</h3>
                <p className="text-sm text-safewatch-muted">
                  Salvar gravações e eventos na nuvem para acesso remoto.
                </p>
              </div>
              <Switch
                checked={settings.cloud_storage_enabled}
                onCheckedChange={() => handleToggleChange('cloud_storage_enabled')}
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">Período de Retenção</h3>
                <span className="text-safewatch-primary">{settings.retention_days} dias</span>
              </div>
              <Slider
                value={[settings.retention_days]}
                min={7}
                max={90}
                step={1}
                onValueChange={(value) => handleSliderChange('retention_days', value)}
              />
              <p className="text-xs text-safewatch-muted mt-1">
                Define por quanto tempo as gravações serão mantidas na nuvem.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferências de IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">Sensibilidade de Detecção de Quedas</h3>
                <span className="text-safewatch-primary">{settings.fall_detection_sensitivity}%</span>
              </div>
              <Slider
                value={[settings.fall_detection_sensitivity]}
                min={10}
                max={100}
                step={5}
                onValueChange={(value) => handleSliderChange('fall_detection_sensitivity', value)}
              />
              <p className="text-xs text-safewatch-muted mt-1">
                Valores mais altos detectam eventos menores, mas podem gerar mais falsos positivos.
              </p>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">Sensibilidade de Detecção de Batimentos</h3>
                <span className="text-safewatch-primary">{settings.heart_rate_detection_sensitivity}%</span>
              </div>
              <Slider
                value={[settings.heart_rate_detection_sensitivity]}
                min={10}
                max={100}
                step={5}
                onValueChange={(value) => handleSliderChange('heart_rate_detection_sensitivity', value)}
              />
              <p className="text-xs text-safewatch-muted mt-1">
                Ajuste a sensibilidade para detecção de anomalias nos batimentos cardíacos.
              </p>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">Sensibilidade de Detecção de Movimento</h3>
                <span className="text-safewatch-primary">{settings.motion_detection_sensitivity}%</span>
              </div>
              <Slider
                value={[settings.motion_detection_sensitivity]}
                min={10}
                max={100}
                step={5}
                onValueChange={(value) => handleSliderChange('motion_detection_sensitivity', value)}
              />
              <p className="text-xs text-safewatch-muted mt-1">
                Detecta movimentos incomuns na área monitorada.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            className="bg-safewatch-primary hover:bg-safewatch-accent"
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
