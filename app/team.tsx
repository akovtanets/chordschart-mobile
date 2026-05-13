import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function TeamScreen() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam();
  }, []);

  async function fetchTeam() {
    // Тут логіка запиту залежить від вашої структури БД. 
    // Зазвичай це запит до таблиці profiles або через таблицю зв'язків team_members.
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error) setMembers(data || []);
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-zinc-900 px-4">
      <Stack.Screen options={{ title: 'Моя Команда', headerShown: true, headerStyle: { backgroundColor: '#18181b' }, headerTintColor: '#fff' }} />
      
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 20 }}
        renderItem={({ item }) => (
          <View className="bg-zinc-800 p-4 rounded-2xl mb-3 border border-zinc-700 flex-row items-center">
            <View className="w-12 h-12 bg-zinc-700 rounded-full items-center justify-center mr-4">
              <Ionicons name="person" size={24} color="#0090ff" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg font-bold">{item.first_name} {item.last_name}</Text>
              <Text className="text-zinc-500 text-sm">{item.specialty || 'Учасник'}</Text>
            </View>
            <View className="bg-blue-500/10 px-3 py-1 rounded-full">
              <Text className="text-[#0090ff] text-xs font-bold uppercase">Online</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}