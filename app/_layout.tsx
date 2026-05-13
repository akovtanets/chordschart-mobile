import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import '../global.css'; // Наш Tailwind
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Хуки для переадресации
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Логика автоматической переадресации
  useEffect(() => {
    if (isInitializing) return;

    // Если нет сессии — отправляем на экран логина
    if (!session) {
      router.replace('/login');
    } 
    // Если сессия есть, а пользователь случайно попал на логин — пускаем в табы
    else if (session && segments[0] === 'login') {
      router.replace('/');
    }
  }, [session, isInitializing, segments]);

  // Экран загрузки (теперь тоже с Tailwind!)
  if (isInitializing) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-900">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Всегда возвращаем Stack, чтобы не ломать контекст навигации
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}