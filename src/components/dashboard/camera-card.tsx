
import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CameraCardProps {
  id: string;
  name: string;
  location?: string;
  thumbnail?: string;
  onDelete?: () => void;
}

export function CameraCard({ id, name, location, thumbnail, onDelete }: CameraCardProps) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    setShowDeleteDialog(false);
  };
  
  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-all">
        <div className="relative aspect-video bg-gray-100">
          {thumbnail ? (
            <img 
              src={thumbnail} 
              alt={`Camera ${name}`} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-gray-200">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-12 h-12 text-gray-400"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <div className="w-3 h-3 rounded-full bg-safewatch-success animate-pulse-slow"></div>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-medium">{name}</h3>
          {location && <p className="text-sm text-safewatch-muted">{location}</p>}
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/cameras/${id}/details`)}>
              Detalhes
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-safewatch-danger hover:text-white hover:bg-safewatch-danger"
              onClick={() => setShowDeleteDialog(true)}
            >
              Remover
            </Button>
          </div>
          <Button variant="default" size="sm" onClick={() => navigate(`/cameras/${id}/view`)}>
            Ver agora
          </Button>
        </CardFooter>
      </Card>
    
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Câmera</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta câmera? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-safewatch-danger hover:bg-safewatch-danger/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
