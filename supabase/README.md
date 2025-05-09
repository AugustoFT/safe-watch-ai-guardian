
# SafeWatch - Supabase Setup Guide

Este arquivo contém instruções para configurar o backend do SafeWatch usando Supabase.

## Configuração das Tabelas

Execute o script SQL em `database-setup.sql` no Supabase SQL Editor para criar:

1. Tabela `cameras` - Armazena informações das câmeras de segurança
2. Tabela `events` - Registra eventos detectados pelas câmeras
3. Tabela `queue_frames` - Gerencia fila de frames para processamento de IA
4. Tabela `alerts` - Armazena alertas/notificações enviados
5. Tabela `user_settings` - Configurações de notificação do usuário

## Políticas de Segurança (RLS)

O script também configura todas as políticas de Row Level Security (RLS) para garantir que:

- Cada usuário só pode ver e gerenciar suas próprias câmeras
- Cada usuário só pode ver eventos/alertas relacionados às suas câmeras
- As configurações de usuário são privadas para cada usuário

## Próximos Passos

Após a configuração do banco de dados:

1. **Implementar CRUD de Câmeras**
   - Conectar o frontend à tabela `cameras`
   - Implementar as funções de adicionar/editar/remover câmeras

2. **Configurar Streaming**
   - Implementar proxy RTSP→HLS para visualização no navegador
   - Conectar o player de vídeo às câmeras registradas

3. **Implementar Processamento de IA**
   - Configurar Worker para processar frames
   - Implementar Edge Function para detecção de objetos/pessoas
   - Configurar registro de eventos na tabela `events`

4. **Implementar Sistema de Notificações**
   - Configurar Edge Functions para SMS, chamadas e push
   - Integrar com serviços externos (Twilio, etc)
   - Registrar notificações enviadas na tabela `alerts`

5. **Configurar CI/CD**
   - Implementar migrations das tabelas e RLS no repositório
   - Configurar deploy automatizado das Edge Functions
