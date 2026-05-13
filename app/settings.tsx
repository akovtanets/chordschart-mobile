import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

// Ті самі ролі, що й на вашому сайті
const SPECIALTIES = [
  { id: 'leader', label: 'Лідер' },
  { id: 'vocalist', label: 'Вокаліст' },
  { id: 'musician', label: 'Музикант' },
  { id: 'sound_engineer', label: 'Звукорежисер' }
];

export default function SettingsScreen() {
  const [loading, setLoading] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [profile, setProfile] = useState({ first_name: '', last_name: '', specialty: 'musician' });

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

  // Знаходимо зрозумілу назву для поточної спеціальності
  const currentSpecialtyLabel = SPECIALTIES.find(s => s.id === profile.specialty)?.label || profile.specialty;

  return (
    <ScrollView className="flex-1 bg-zinc-900 px-6">
      <Stack.Screen options={{ 
        title: 'Налаштування', 
        headerShown: true, 
        headerStyle: { backgroundColor: '#18181b' }, 
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerBackTitle: 'Назад',
      }} />
      
      <View className="mt-8">
        <Text className="text-zinc-500 mb-2 ml-1 uppercase text-[10px] font-black tracking-widest">Особисті дані</Text>
        
        <View className="bg-zinc-800 rounded-[24px] p-5 border border-zinc-700 mb-6">
          <Text className="text-zinc-400 text-xs mb-1 ml-1">Ім'я</Text>
          <TextInput 
            className="text-white text-lg py-2 border-b border-zinc-700 mb-6"
            value={profile.first_name}
            onChangeText={(t) => setProfile({...profile, first_name: t})}
          />
          
          <Text className="text-zinc-400 text-xs mb-1 ml-1">Прізвище</Text>
          <TextInput 
            className="text-white text-lg py-2 border-b border-zinc-700 mb-6"
            value={profile.last_name}
            onChangeText={(t) => setProfile({...profile, last_name: t})}
          />

          <Text className="text-zinc-400 text-xs mb-2 ml-1">Ваша роль</Text>
          
          {/* Кастомний селектор (замість <select>) */}
          <TouchableOpacity 
            onPress={() => setIsPickerOpen(true)}
            className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex-row justify-between items-center"
          >
            <Text className="text-white font-bold italic uppercase text-sm tracking-tighter">
              {currentSpecialtyLabel}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#0090ff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={updateProfile}
          disabled={loading}
          className="bg-[#0090ff] py-5 rounded-2xl items-center shadow-lg active:bg-[#007cdb]"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-black uppercase italic tracking-tighter">Зберегти зміни</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Модальне вікно вибору ролі */}
      <Modal visible={isPickerOpen} transparent={true} animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center p-6">
          <View className="bg-[#0d0d0d] border border-zinc-800 rounded-[32px] w-full max-w-sm overflow-hidden">
            <View className="p-4 border-b border-zinc-800 items-center">
              <Text className="text-white font-black uppercase italic tracking-widest">Оберіть роль</Text>
            </View>
            
            {SPECIALTIES.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setProfile({ ...profile, specialty: item.id });
                  setIsPickerOpen(false);
                }}
                className={`p-5 items-center border-b border-zinc-800/50 ${profile.specialty === item.id ? 'bg-blue-600' : ''}`}
              >
                <Text className={`font-bold uppercase italic ${profile.specialty === item.id ? 'text-white' : 'text-zinc-400'}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity 
              onPress={() => setIsPickerOpen(false)}
              className="p-5 items-center"
            >
              <Text className="text-zinc-500 font-bold uppercase text-xs">Скасувати</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}