import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase keys missing. App running in in-memory mode. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable persistence.");
}

// Export client as null if keys are missing
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type DbUserPhoto = {
  id: string;
  user_id: string;
  data: string; // base64
  gender: string;
  is_primary: boolean;
  created_at?: string;
};

export type DbWardrobeItem = {
  id: string;
  user_id: string;
  product_json: any;
  created_at?: string;
};

export type DbGeneratedLook = {
  id: string;
  user_id: string;
  result_json: any;
  created_at?: string;
};

export type DbChatSession = {
  id: string;
  user_id: string;
  title: string;
  preview_text: string | null;
  last_modified: string; // ISO
  created_at?: string;
};

export type DbChatMessage = {
  id: string;
  session_id: string;
  role: string;
  text: string;
  timestamp: string; // ISO
  meta_json: any; // JSONB for attachments, userAttachments, groundingMetadata
  created_at?: string;
};
