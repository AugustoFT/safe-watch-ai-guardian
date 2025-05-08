
import * as z from "zod";

export const profileSchema = z.object({
  name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
  phone: z.string().min(8, { message: "Telefone inválido" }),
  emergencyContacts: z.array(
    z.object({
      name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
      relationship: z.string().min(2, { message: "Relação deve ter pelo menos 2 caracteres" }),
      phone: z.string().min(8, { message: "Telefone inválido" })
    })
  ).min(1, { message: "Adicione pelo menos um contato de emergência" })
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
