
import React from 'react';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProfileAvatar from './ProfileAvatar';

interface PersonalInfoFormProps {
  name: string;
  email: string;
  phone: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PersonalInfoForm = ({ name, email, phone, onInputChange }: PersonalInfoFormProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Informações Pessoais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProfileAvatar />
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">Nome</label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={onInputChange}
            required
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">E-mail</label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={onInputChange}
            disabled
            className="bg-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">O e-mail não pode ser alterado</p>
        </div>
        
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">Telefone</label>
          <Input
            id="phone"
            name="phone"
            value={phone}
            onChange={onInputChange}
            required
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalInfoForm;
