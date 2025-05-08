
import React from 'react';
import { Button } from "@/components/ui/button";
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecordingListItemProps {
  id: string;
  title: string;
  date: Date;
  eventType: 'fall' | 'movement' | 'heart' | 'other';
  cameraName: string;
  onView: (id: string) => void;
}

export function RecordingListItem({ id, title, date, eventType, cameraName, onView }: RecordingListItemProps) {
  const getEventIcon = () => {
    switch (eventType) {
      case 'fall':
        return (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-5 h-5 text-safewatch-danger"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
          </svg>
        );
      case 'heart':
        return (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-5 h-5 text-safewatch-warning"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        );
      case 'movement':
        return (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-5 h-5 text-safewatch-primary"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51 15.42 17.49" />
            <path d="M15.41 6.51 8.59 10.49" />
          </svg>
        );
      default:
        return (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-5 h-5 text-safewatch-muted"
          >
            <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        );
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg mb-2 hover:bg-gray-50">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {getEventIcon()}
        </div>
        <div>
          <h4 className="font-medium">{title}</h4>
          <div className="flex items-center text-sm text-safewatch-muted">
            <span>{cameraName}</span>
            <span className="mx-1">•</span>
            <span>{formatDistance(date, new Date(), { addSuffix: true, locale: ptBR })}</span>
          </div>
        </div>
      </div>
      <Button size="sm" onClick={() => onView(id)}>
        Ver
      </Button>
    </div>
  );
}
