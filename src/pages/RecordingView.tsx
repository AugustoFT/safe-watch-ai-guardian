
import React from 'react';
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RecordingView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data - in a real app this would come from API
  const recording = {
    id,
    title: 'Possível queda detectada',
    date: new Date(2023, 4, 15, 14, 32),
    description: 'O sistema detectou um movimento rápido seguido de inatividade prolongada, indicando uma possível queda.',
    camera: 'Quarto Principal',
    thumbnail: '',
    aiConfidence: 94,
    actions: [
      { timestamp: '14:32:05', action: 'Detecção de movimento anormal' },
      { timestamp: '14:32:08', action: 'Detecção de possível queda' },
      { timestamp: '14:32:10', action: 'SMS enviado para contato principal' },
      { timestamp: '14:32:15', action: 'Ligação iniciada para serviço de emergência' },
    ]
  };

  return (
    <div className="container mx-auto max-w-4xl">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-2" 
          onClick={() => navigate('/recordings')}
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
          Voltar para Gravações
        </Button>
      </div>

      <h1 className="text-2xl font-bold mb-2 text-safewatch-text">{recording.title}</h1>
      <p className="text-safewatch-muted mb-6">
        {recording.date.toLocaleDateString('pt-BR')} às {recording.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {recording.camera}
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="bg-gray-200 aspect-video rounded-lg flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-16 h-16 text-gray-400"
            >
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" />
            </svg>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="flex-1">
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              Baixar
            </Button>
            <Button variant="outline" className="flex-1">
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
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              Salvar
            </Button>
            <Button variant="outline" className="flex-1 text-safewatch-danger">
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
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <line x1="9" x2="15" y1="9" y2="15" />
                <line x1="15" x2="9" y1="9" y2="15" />
              </svg>
              Apagar
            </Button>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Detalhes do Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-safewatch-muted">Confiança do AI</dt>
                  <dd className="font-medium">{recording.aiConfidence}%</dd>
                </div>
                <div>
                  <dt className="text-sm text-safewatch-muted">Local</dt>
                  <dd className="font-medium">{recording.camera}</dd>
                </div>
                <div>
                  <dt className="text-sm text-safewatch-muted">Data e Hora</dt>
                  <dd className="font-medium">
                    {recording.date.toLocaleDateString('pt-BR')} às {recording.date.toLocaleTimeString('pt-BR')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-safewatch-muted">Duração</dt>
                  <dd className="font-medium">00:01:23</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Ações Tomadas</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l border-gray-200 ml-3 space-y-2">
                {recording.actions.map((action, index) => (
                  <li key={index} className="ml-6">
                    <span className="absolute flex items-center justify-center w-6 h-6 bg-white rounded-full -left-3 border border-gray-200">
                      <div className="w-2 h-2 rounded-full bg-safewatch-primary"></div>
                    </span>
                    <p className="text-sm font-medium">{action.action}</p>
                    <time className="text-xs text-safewatch-muted">{action.timestamp}</time>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Descrição</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{recording.description}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecordingView;
