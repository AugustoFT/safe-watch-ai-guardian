
-- This file contains SQL commands to set up the database tables and RLS policies
-- Run these commands in the SQL Editor in Supabase dashboard or via supabase db push

-- Create cameras table
CREATE TABLE IF NOT EXISTS public.cameras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  rtsp_url TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'offline',
  description TEXT,
  last_connected TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  confidence DECIMAL(5,2),
  frame_url TEXT,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create queue_frames table for AI processing queue
CREATE TABLE IF NOT EXISTS public.queue_frames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frame_url TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  event_id UUID REFERENCES public.events(id),
  error TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create alerts table for notifications
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  recipient TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  external_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_plan TEXT DEFAULT 'basic',
  notifications_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  call_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  cloud_storage_enabled BOOLEAN DEFAULT true,
  retention_days INTEGER DEFAULT 30,
  fall_detection_sensitivity INTEGER DEFAULT 70,
  heart_rate_detection_sensitivity INTEGER DEFAULT 60,
  motion_detection_sensitivity INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create emergency_contacts table if not exists
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create model_metrics table for ML tracking
CREATE TABLE IF NOT EXISTS public.model_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name TEXT NOT NULL,
  version TEXT NOT NULL,
  accuracy DECIMAL(5,4),
  precision DECIMAL(5,4),
  recall DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  training_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  parameters JSONB,
  model_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cameras
CREATE POLICY IF NOT EXISTS "Users can view their own cameras" ON public.cameras
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own cameras" ON public.cameras
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own cameras" ON public.cameras
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own cameras" ON public.cameras
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for events
CREATE POLICY IF NOT EXISTS "Users can view their own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert events
CREATE POLICY IF NOT EXISTS "Service can insert events" ON public.events
  FOR INSERT TO service_role WITH CHECK (true);

-- RLS Policies for queue_frames
CREATE POLICY IF NOT EXISTS "Users can view their own queue frames" ON public.queue_frames
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert queue frames for their cameras" ON public.queue_frames
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update queue frames
CREATE POLICY IF NOT EXISTS "Service can update queue frames" ON public.queue_frames
  FOR UPDATE TO service_role USING (true);

-- RLS Policies for alerts
CREATE POLICY IF NOT EXISTS "Users can view their own alerts" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert alerts
CREATE POLICY IF NOT EXISTS "Service can insert alerts" ON public.alerts
  FOR INSERT TO service_role WITH CHECK (true);

-- RLS Policies for user_settings
CREATE POLICY IF NOT EXISTS "Users can view their own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY IF NOT EXISTS "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for emergency_contacts
CREATE POLICY IF NOT EXISTS "Users can view their own emergency contacts" ON public.emergency_contacts
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own emergency contacts" ON public.emergency_contacts
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY IF NOT EXISTS "Users can update their own emergency contacts" ON public.emergency_contacts
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own emergency contacts" ON public.emergency_contacts
  FOR DELETE USING (auth.uid() = profile_id);

-- Create a default setting for each new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
