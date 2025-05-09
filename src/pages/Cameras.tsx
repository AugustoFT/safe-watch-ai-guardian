
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { CameraCard } from '@/components/dashboard/camera-card';
import { getCameras, deleteCamera, type Camera } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";

const Cameras = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCameras = async () => {
      try {
        setIsLoading(true);
        const data = await getCameras();
        setCameras(data || []);
      } catch (error) {
        console.error('Erro ao carregar câmeras:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar suas câmeras.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCameras();
  }, [toast]);

  const handleDelete = async (id: string) => {
    try {
      await deleteCamera(id);
      setCameras(prev => prev.filter(camera => camera.id !== id));
      toast({
        title: "Câmera removida",
        description: "A câmera foi removida com sucesso."
      });
    } catch (error) {
      console.error('Erro ao remover câmera:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a câmera.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-safewatch-text">Minhas Câmeras</h1>
        <Button 
          className="bg-safewatch-primary hover:bg-safewatch-accent"
          onClick={() => navigate('/cameras/add')}
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
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Adicionar Câmera
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-safewatch-primary"></div>
        </div>
      ) : cameras.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-safewatch-muted"
            >
              <path d="M15 7h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2" />
              <path d="M12 17v-6" />
              <path d="M9 11h6" />
              <rect width="8" height="4" x="8" y="3" rx="1" />
            </svg>
          </div>
          <h2 className="text-lg font-medium mb-2">Nenhuma câmera adicionada</h2>
          <p className="text-safewatch-muted mb-4">Adicione sua primeira câmera para começar o monitoramento.</p>
          <Button 
            className="bg-safewatch-primary hover:bg-safewatch-accent"
            onClick={() => navigate('/cameras/add')}
          >
            Adicionar Câmera
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map((camera) => (
            <CameraCard
              key={camera.id}
              id={camera.id || ''}
              name={camera.name}
              location={camera.location}
              onDelete={() => camera.id && handleDelete(camera.id)}
            />
          ))}
          <div className="border border-dashed rounded-lg flex items-center justify-center p-6 aspect-video hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/cameras/add')}>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-safewatch-primary/10 flex items-center justify-center mb-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-6 h-6 text-safewatch-primary"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
              </div>
              <p className="font-medium text-safewatch-primary">Adicionar Câmera</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cameras;
