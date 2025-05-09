
// Common types used across supabase modules
export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
  emergency_contacts?: EmergencyContact[];
}

export type EmergencyContact = {
  id?: string;
  profile_id?: string;
  name: string;
  relationship: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
}

export type Camera = {
  id?: string;
  user_id?: string;
  name: string;
  location: string;
  rtsp_url: string;
  description?: string;
  status?: 'online' | 'offline' | 'error';
  created_at?: string;
  updated_at?: string;
}

export type UserSettings = {
  id?: string;
  user_id: string;
  subscription_plan?: string;
  sms_enabled: boolean;
  call_enabled: boolean;
  push_enabled: boolean;
  cloud_storage_enabled: boolean;
  retention_days: number;
  fall_detection_sensitivity: number;
  heart_rate_detection_sensitivity: number;
  motion_detection_sensitivity: number;
  created_at?: string;
  updated_at?: string;
  device_token?: string;
  notification_threshold?: number;
}
