import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase'; // проверьте правильность пути

export default function SetlistsScreen() {
  const [setlists, setSetlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSetlists();
  }, []);

  const fetchSetlists = async () => {
    try {
      setLoading(true);

      // 1. Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error("Пользователь не авторизован");
        return;
      }

      // 2. Делаем запрос с фильтрацией по user_id
      const { data, error } = await supabase
        .from('setlists') // убедитесь, что таблица называется именно так
        .select('*')
        .eq('user_id', user.id) // ФИЛЬТР: только мои записи
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSetlists(data || []);
    } catch (error: any) {
      console.error('Ошибка загрузки сетлистов:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-zinc-900 px-4 pt-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-white text-2xl font-bold">Мої Сетлисти</Text>
        <TouchableOpacity className="bg-[#0090ff] p-2 rounded-lg" onPress={fetchSetlists}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0090ff" />
      ) : (
        <FlatList
          data={setlists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="bg-zinc-800 p-4 rounded-2xl mb-4 flex-row items-center justify-between border border-zinc-700 active:bg-zinc-700"
            >
              <View>
                <Text className="text-white text-lg font-bold mb-1">{item.title}</Text>
                <Text className="text-zinc-400 text-sm">
                  {new Date(item.created_at).toLocaleDateString('uk-UA')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#71717a" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text className="text-zinc-500 text-center mt-10">У вас ще немає сетлистів</Text>
          }
        />
      )}
    </View>
  );
}