import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Shelf = {
  id: string;
  code: string;
  name: string;
  description?: string;
  created_at: string;
};

export type InventoryItem = {
  id: string;
  inventory_code: string;
  product_name: string;
  serial_number?: string;
  shelf_code?: string;
  quantity: number;
  updated_at: string;
};
