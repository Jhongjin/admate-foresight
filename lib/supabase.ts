import { createClient } from '@supabase/supabase-js';
import {
  getForesightSupabaseAnonKey,
  getForesightSupabaseUrl,
} from './foresightSupabaseEnv';

const supabaseUrl = getForesightSupabaseUrl();
const supabaseKey = getForesightSupabaseAnonKey();

export const supabase = createClient(supabaseUrl, supabaseKey);
