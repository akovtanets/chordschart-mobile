import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function SongsScreen() {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('songs') // Перевірте назву таблиці в Supabase
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;
      setSongs(data || []);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = songs.filter(song => 
    song.title.toLowerCase().includes(search.toLowerCase()) || 
    song.artist?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-zinc-900 px-4 pt-4">
      {/* Рядок пошуку */}
      <View className="bg-zinc-800 flex-row items-center px-4 py-3 rounded-xl mb-6 border border-zinc-700">
        <Ionicons name="search" size={20} color="#71717a" />
        <TextInput 
          className="flex-1 ml-3 text-white text-base"
          placeholder="Пошук пісні або автора..."
          placeholderTextColor="#71717a"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0090ff" />
      ) : (
        <FlatList
          data={filteredSongs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity className="bg-zinc-800 p-4 rounded-xl mb-3 border border-zinc-700 flex-row justify-between items-center">
              <View>
                <Text className="text-white text-lg font-semibold">{item.title}</Text>
                <Text className="text-zinc-500 text-sm">{item.artist || 'Автор невідомий'}</Text>
              </View>
              <View className="bg-zinc-700 px-2 py-1 rounded">
                <Text className="text-[#0090ff] font-bold">{item.key || 'C'}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text className="text-zinc-500 text-center mt-10">Пісень не знайдено</Text>
          }
        />
      )}
    </View>
  );
}