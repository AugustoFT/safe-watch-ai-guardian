
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'online' | 'offline' | 'warning' | 'alert';
}

export function StatusCard({ title, description, icon, status }: StatusCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-safewatch-success/10 text-safewatch-success border-safewatch-success/20';
      case 'offline':
        return 'bg-safewatch-muted/10 text-safewatch-muted border-safewatch-muted/20';
      case 'warning':
        return 'bg-safewatch-warning/10 text-safewatch-warning border-safewatch-warning/20';
      case 'alert':
        return 'bg-safewatch-danger/10 text-safewatch-danger border-safewatch-danger/20';
      default:
        return 'bg-safewatch-muted/10 text-safewatch-muted border-safewatch-muted/20';
    }
  };

  const getStatusIndicator = () => {
    switch (status) {
      case 'online':
        return 'bg-safewatch-success';
      case 'offline':
        return 'bg-safewatch-muted';
      case 'warning':
        return 'bg-safewatch-warning';
      case 'alert':
        return 'bg-safewatch-danger animate-pulse';
      default:
        return 'bg-safewatch-muted';
    }
  };

  return (
    <Card className={`border ${getStatusColor()} hover:shadow-md transition-all`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getStatusIndicator()}`}></div>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}
