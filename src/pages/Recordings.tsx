
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingListItem } from '@/components/dashboard/recording-list-item';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";

const Recordings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Mock data for recordings
  const recordings = [
    {
      id: '1',
      title: 'Possível queda detectada',
      date: new Date(2023, 4, 15, 14, 32),
      eventType: 'fall' as const,
      cameraName: 'Quarto Principal'
    },
    {
      id: '2',
      title: 'Movimento incomum',
      date: new Date(2023, 4, 14, 3, 15),
      eventType: 'movement' as const,
      cameraName: 'Sala de Estar'
    },
    {
      id: '3',
      title: 'Batimentos cardíacos anormais',
      date: new Date(2023, 4, 10, 17, 45),
      eventType: 'heart' as const,
      cameraName: 'Quarto Principal'
    },
  ];

  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const handleViewRecording = (id: string) => {
    toast({
      title: "Visualizando gravação",
      description: `Abrindo gravação ${id}`,
    });
    navigate(`/recordings/${id}`);
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Filtro aplicado",
      description: `Buscando gravações de ${dateRange.start} até ${dateRange.end}`,
    });
  };

  return (
    <div className="container mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-safewatch-text">Gravações</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtrar por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFilter} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="start" className="block text-sm font-medium mb-1">Data Inicial</label>
              <Input
                id="start"
                name="start"
                type="date"
                value={dateRange.start}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="end" className="block text-sm font-medium mb-1">Data Final</label>
              <Input
                id="end"
                name="end"
                type="date"
                value={dateRange.end}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="bg-safewatch-primary hover:bg-safewatch-accent h-10">
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium mb-4">Eventos Críticos</h2>
          <div className="space-y-2">
            {recordings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-safewatch-muted">Nenhuma gravação encontrada.</p>
              </div>
            ) : (
              recordings.map((recording) => (
                <RecordingListItem
                  key={recording.id}
                  id={recording.id}
                  title={recording.title}
                  date={recording.date}
                  eventType={recording.eventType}
                  cameraName={recording.cameraName}
                  onView={handleViewRecording}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <Button variant="outline" className="w-full max-w-xs">
            Carregar Mais
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Recordings;
