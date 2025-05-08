
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    subscription: 'premium',
    notifications: {
      sms: true,
      call: true,
      push: true,
    },
    storage: {
      cloudEnabled: true,
      retentionDays: 30,
    },
    ai: {
      fallDetectionSensitivity: 70,
      heartRateDetectionSensitivity: 60,
      motionDetectionSensitivity: 50,
    }
  });

  const handleToggleChange = (section: 'notifications' | 'storage', field: string) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: !prev[section][field],
      }
    }));
  };

  const handleSliderChange = (field: string, value: number[]) => {
    setSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        [field]: value[0],
      }
    }));
  };

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: "Suas preferências foram atualizadas com sucesso.",
    });
  };

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
                <h3 className="font-medium">Plano {settings.subscription === 'premium' ? 'Premium' : 'Básico'}</h3>
                <p className="text-sm text-safewatch-muted">
                  {settings.subscription === 'premium' 
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
                checked={settings.notifications.sms}
                onCheckedChange={() => handleToggleChange('notifications', 'sms')}
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
                checked={settings.notifications.call}
                onCheckedChange={() => handleToggleChange('notifications', 'call')}
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
                checked={settings.notifications.push}
                onCheckedChange={() => handleToggleChange('notifications', 'push')}
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
                checked={settings.storage.cloudEnabled}
                onCheckedChange={() => handleToggleChange('storage', 'cloudEnabled')}
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">Período de Retenção</h3>
                <span className="text-safewatch-primary">{settings.storage.retentionDays} dias</span>
              </div>
              <Slider
                value={[settings.storage.retentionDays]}
                min={7}
                max={90}
                step={1}
                onValueChange={(value) => setSettings(prev => ({
                  ...prev,
                  storage: {
                    ...prev.storage,
                    retentionDays: value[0],
                  }
                }))}
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
                <span className="text-safewatch-primary">{settings.ai.fallDetectionSensitivity}%</span>
              </div>
              <Slider
                value={[settings.ai.fallDetectionSensitivity]}
                min={10}
                max={100}
                step={5}
                onValueChange={(value) => handleSliderChange('fallDetectionSensitivity', value)}
              />
              <p className="text-xs text-safewatch-muted mt-1">
                Valores mais altos detectam eventos menores, mas podem gerar mais falsos positivos.
              </p>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">Sensibilidade de Detecção de Batimentos</h3>
                <span className="text-safewatch-primary">{settings.ai.heartRateDetectionSensitivity}%</span>
              </div>
              <Slider
                value={[settings.ai.heartRateDetectionSensitivity]}
                min={10}
                max={100}
                step={5}
                onValueChange={(value) => handleSliderChange('heartRateDetectionSensitivity', value)}
              />
              <p className="text-xs text-safewatch-muted mt-1">
                Ajuste a sensibilidade para detecção de anomalias nos batimentos cardíacos.
              </p>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">Sensibilidade de Detecção de Movimento</h3>
                <span className="text-safewatch-primary">{settings.ai.motionDetectionSensitivity}%</span>
              </div>
              <Slider
                value={[settings.ai.motionDetectionSensitivity]}
                min={10}
                max={100}
                step={5}
                onValueChange={(value) => handleSliderChange('motionDetectionSensitivity', value)}
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
          >
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
