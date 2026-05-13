import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ first_name: '', last_name: '', specialty: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    }
  }

  async function updateProfile() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('profiles').update(profile).eq('id', user?.id);
    setLoading(false);
    if (!error) alert('Дані оновлено!');
  }

  return (
    <ScrollView className="flex-1 bg-zinc-900 px-6">
      <Stack.Screen options={{ title: 'Налаштування', headerShown: true, headerStyle: { backgroundColor: '#18181b' }, headerTintColor: '#fff' }} />
      
      <View className="mt-8">
        <Text className="text-zinc-500 mb-2 ml-1 uppercase text-xs font-bold">Особисті дані</Text>
        
        <View className="bg-zinc-800 rounded-2xl p-4 border border-zinc-700 mb-6">
          <Text className="text-zinc-400 mb-1 ml-1">Ім'я</Text>
          <TextInput 
            className="text-white text-lg py-2 border-b border-zinc-700 mb-4"
            value={profile.first_name}
            onChangeText={(t) => setProfile({...profile, first_name: t})}
          />
          
          <Text className="text-zinc-400 mb-1 ml-1">Прізвище</Text>
          <TextInput 
            className="text-white text-lg py-2 border-b border-zinc-700 mb-4"
            value={profile.last_name}
            onChangeText={(t) => setProfile({...profile, last_name: t})}
          />

          <Text className="text-zinc-400 mb-1 ml-1">Спеціалізація (інструмент)</Text>
          <TextInput 
            className="text-white text-lg py-2"
            value={profile.specialty}
            placeholder="Напр. Гітара"
            placeholderTextColor="#52525b"
            onChangeText={(t) => setProfile({...profile, specialty: t})}
          />
        </View>

        <TouchableOpacity 
          onPress={updateProfile}
          disabled={loading}
          className="bg-[#0090ff] py-4 rounded-xl items-center shadow-lg active:bg-[#007cdb]"
        >
          <Text className="text-white text-lg font-bold">Зберегти зміни</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}