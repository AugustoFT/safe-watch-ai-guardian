
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { addCamera } from '@/lib/supabase';

const CameraAdd = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    rtsp_url: '',
    description: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await addCamera({
        name: formData.name,
        location: formData.location,
        rtsp_url: formData.rtsp_url,
        description: formData.description
      });
      
      toast({
        title: "Câmera adicionada",
        description: "Sua câmera foi adicionada com sucesso.",
      });
      navigate('/cameras');
    } catch (error) {
      console.error("Erro ao adicionar câmera:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a câmera.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-2" 
          onClick={() => navigate('/cameras')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 mr-2"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-safewatch-text">Adicionar Nova Câmera</h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações da Câmera</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Nome da Câmera</label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Quarto Principal"
                required
              />
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-1">Localização</label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Ex: Segundo andar"
                required
              />
            </div>
            
            <div>
              <label htmlFor="rtsp_url" className="block text-sm font-medium mb-1">URL da Câmera (RTSP)</label>
              <Input
                id="rtsp_url"
                name="rtsp_url"
                value={formData.rtsp_url}
                onChange={handleInputChange}
                placeholder="rtsp://usuario:senha@192.168.1.100:554/stream"
                required
              />
              <p className="text-xs text-safewatch-muted mt-1">
                Insira a URL completa da sua câmera IP, incluindo credenciais se necessário.
              </p>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">Descrição (opcional)</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Descrição adicional da câmera..."
                className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="bg-safewatch-primary/10 p-4 rounded-md">
              <h4 className="font-medium mb-2 text-safewatch-primary flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 mr-2"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
                Dicas de Configuração
              </h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-safewatch-muted">
                <li>Certifique-se que a câmera está conectada na mesma rede.</li>
                <li>Para câmeras IP, configure um endereço estático no roteador.</li>
                <li>Verifique o manual da câmera para obter a URL RTSP correta.</li>
                <li>O formato geralmente é: rtsp://[usuário]:[senha]@[ip]:[porta]/[stream]</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/cameras')}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            className="bg-safewatch-primary hover:bg-safewatch-accent"
            disabled={isLoading}
          >
            {isLoading ? "Adicionando..." : "Adicionar Câmera"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CameraAdd;
