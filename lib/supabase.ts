import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// TODO: Замените на ваши ключи из веб-проекта
const supabaseUrl = 'https://yeqfjsbottlflbyjfjsh.supabase.co';
const supabaseAnonKey = 'sb_publishable_bPqmGZdLaPHZquNfragPtQ_P7VwCNvO';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // На мобилках нет URL-строки как в браузере
  },
});