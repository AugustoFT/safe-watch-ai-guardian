
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Contact {
  name: string;
  relationship: string;
  phone: string;
}

interface EmergencyContactsFormProps {
  contacts: Contact[];
  onContactChange: (index: number, field: string, value: string) => void;
  onAddContact: () => void;
  onRemoveContact: (index: number) => void;
}

const EmergencyContactsForm = ({
  contacts,
  onContactChange,
  onAddContact,
  onRemoveContact
}: EmergencyContactsFormProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Contatos de Emergência</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {contacts.map((contact, index) => (
          <div key={index} className="p-4 border rounded-md relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 text-safewatch-muted hover:text-safewatch-danger"
              onClick={() => onRemoveContact(index)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </svg>
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <Input
                  value={contact.name}
                  onChange={(e) => onContactChange(index, 'name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Relação</label>
                <Input
                  value={contact.relationship}
                  onChange={(e) => onContactChange(index, 'relationship', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <Input
                  value={contact.phone}
                  onChange={(e) => onContactChange(index, 'phone', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={onAddContact}
          className="w-full"
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
          Adicionar Contato
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmergencyContactsForm;
