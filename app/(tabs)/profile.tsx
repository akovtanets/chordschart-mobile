import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<{
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  }>({
    email: null,
    first_name: null,
    last_name: null,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Завантажуємо додаткові дані з таблиці profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        setUserData({
          email: user.email ?? null,
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-zinc-900 justify-center items-center">
        <ActivityIndicator color="#0090ff" />
      </View>
    );
  }

  const displayName = userData.first_name 
    ? `${userData.first_name} ${userData.last_name ?? ''}`.trim()
    : userData.email?.split('@')[0];

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-10">
      <View className="items-center mb-10">
        {/* Аватар з вашим фірмовим кольором */}
        <View className="w-24 h-24 bg-zinc-800 rounded-full items-center justify-center border-2 border-[#0090ff] mb-4 shadow-xl">
          <Ionicons name="person" size={50} color="#0090ff" />
        </View>
        
        <Text className="text-white text-2xl font-bold">{displayName}</Text>
        <Text className="text-zinc-500 text-base mt-1">{userData.email}</Text>
      </View>

      <View className="bg-zinc-800 rounded-2xl p-2 border border-zinc-700 shadow-sm">
        {/* Кнопка Налаштування */}
        <TouchableOpacity 
          onPress={() => router.push('/settings')}
          className="flex-row items-center p-4 border-b border-zinc-700 active:bg-zinc-700 rounded-t-xl"
        >
          <View className="w-8 h-8 bg-blue-500/10 rounded-lg items-center justify-center">
            <Ionicons name="settings-outline" size={20} color="#0090ff" />
          </View>
          <Text className="text-white text-lg flex-1 ml-4">Налаштування</Text>
          <Ionicons name="chevron-forward" size={20} color="#71717a" />
        </TouchableOpacity>

        {/* Кнопка Моя Команда */}
        <TouchableOpacity 
          onPress={() => router.push('/team')}
          className="flex-row items-center p-4 border-b border-zinc-700 active:bg-zinc-700"
        >
          <View className="w-8 h-8 bg-purple-500/10 rounded-lg items-center justify-center">
            <Ionicons name="people-outline" size={20} color="#a855f7" />
          </View>
          <Text className="text-white text-lg flex-1 ml-4">Моя Команда</Text>
          <Ionicons name="chevron-forward" size={20} color="#71717a" />
        </TouchableOpacity>

        {/* Кнопка Вихід */}
        <TouchableOpacity 
          onPress={handleSignOut}
          className="flex-row items-center p-4 active:bg-zinc-700 rounded-b-xl"
        >
          <View className="w-8 h-8 bg-red-500/10 rounded-lg items-center justify-center">
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </View>
          <Text className="text-[#ef4444] text-lg flex-1 ml-4">Вийти з акаунта</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-auto mb-8">
        <Text className="text-zinc-600 text-center text-xs uppercase tracking-[4px]">
          ChordsChart
        </Text>
        <Text className="text-zinc-700 text-center text-[10px] mt-1">
          MOBILE VERSION 1.0.0
        </Text>
      </View>
    </View>
  );
}