
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string;
    title: string;
    icon: React.ReactNode;
  }[];
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const location = useLocation();

  return (
    <nav className={cn("flex flex-col space-y-1", className)} {...props}>
      {items.map((item) => {
        const isActive = location.pathname === item.href;
        
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-safewatch-primary/10",
              isActive 
                ? "bg-safewatch-primary/10 text-safewatch-primary" 
                : "text-safewatch-muted hover:text-safewatch-text"
            )}
          >
            <span className={cn(
              "h-5 w-5",
              isActive ? "text-safewatch-primary" : "text-safewatch-muted"
            )}>
              {item.icon}
            </span>
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
