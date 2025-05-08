
import React from 'react';
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProfileAvatar from './ProfileAvatar';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

interface PersonalInfoFormProps {
  email: string;
}

const PersonalInfoForm = ({ email }: PersonalInfoFormProps) => {
  const { control } = useFormContext();
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Informações Pessoais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProfileAvatar />
        
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">E-mail</label>
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="bg-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">O e-mail não pode ser alterado</p>
        </div>
        
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default PersonalInfoForm;
