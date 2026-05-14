import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router'; // ДОДАНО: Імпорт роутера для навігації
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
        .from('songs') 
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
    (song.author || song.artist)?.toLowerCase().includes(search.toLowerCase())
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
          keyExtractor={(item) => item.id.toString()} // Надійніше перетворювати в рядок
          renderItem={({ item }) => (
            <TouchableOpacity 
              // ДОДАНО: Перехід на сторінку пісні з передачею source: 'tab'
              onPress={() => router.push({ pathname: '/song-view', params: { id: item.id, source: 'tab' } } as any)}
              className="bg-zinc-800 p-4 rounded-xl mb-3 border border-zinc-700 flex-row justify-between items-center"
            >
              <View className="flex-1 mr-4">
                <Text className="text-white text-lg font-semibold" numberOfLines={1}>{item.title}</Text>
                {/* Використовуємо author, як у базі, або artist як фолбек */}
                <Text className="text-zinc-500 text-sm" numberOfLines={1}>{item.author || item.artist || 'Автор невідомий'}</Text>
              </View>
              <View className="bg-zinc-700 px-2 py-1 rounded">
                <Text className="text-[#0090ff] font-bold">{item.default_key || item.key || 'C'}</Text>
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