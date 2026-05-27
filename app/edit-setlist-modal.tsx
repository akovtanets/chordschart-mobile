import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function EditSetlistModal() {
  const { id } = useLocalSearchParams();
  const [songs, setSongs] = useState<any[]>([]);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSetlist();
    fetchAllSongs();
  }, []);

  async function fetchSetlist() {
    setLoading(true);
    const { data: setlist } = await supabase.from('setlists').select('song_ids').eq('id', id).single();
    if (setlist?.song_ids) {
      const { data: songsData } = await supabase.from('songs').select('*').in('id', setlist.song_ids);
      if (songsData) {
        // Сортируем согласно порядку в setlist.song_ids
        const sorted = setlist.song_ids.map((sId: any) => songsData.find((s: any) => s.id === sId)).filter(Boolean);
        setSongs(sorted);
      }
    }
    setLoading(false);
  }

  async function fetchAllSongs() {
    const { data } = await supabase.from("songs").select("id, title, author").order('title');
    setAllSongs(data || []);
  }

  const updateDatabase = async (newSongs: any[]) => {
    setSongs(newSongs);
    await supabase.from("setlists").update({ song_ids: newSongs.map(s => s.id) }).eq("id", id);
  };

  const filteredSongs = allSongs.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // РЕЖИМ ПОИСКА И ДОБАВЛЕНИЯ
  if (isSearching) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
        <TextInput 
          autoFocus
          placeholder="Введіть назву пісні..." 
          placeholderTextColor="#666"
          style={{ backgroundColor: '#18181b', padding: 15, borderRadius: 12, color: '#fff', marginBottom: 15 }}
          onChangeText={setSearchQuery}
          value={searchQuery}
        />
        <FlatList 
          data={filteredSongs} 
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => { updateDatabase([...songs, item]); setIsSearching(false); setSearchQuery(""); }} 
              style={{ padding: 15, backgroundColor: '#18181b', marginBottom: 5, borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{item.title}</Text>
              <Text style={{ color: '#666', fontSize: 12 }}>{item.author}</Text>
            </TouchableOpacity>
          )} 
        />
        <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(""); }} style={{ marginTop: 10, padding: 15, backgroundColor: '#7f1d1d', borderRadius: 12 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>СКАСУВАТИ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ОСНОВНОЙ РЕЖИМ РЕДАКТИРОВАНИЯ
  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase' }}>Редагування сетлиста</Text>
      
      {loading ? <ActivityIndicator color="#fff" /> : (
        <FlatList
          data={songs}
          keyExtractor={(item, index) => item.id.toString() + index}
          renderItem={({ item, index }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 15, borderRadius: 12, marginBottom: 10 }}>
              <Text style={{ color: '#fff', flex: 1, fontWeight: '600' }}>{item.title}</Text>
              
              <TouchableOpacity onPress={() => {
                const newSongs = [...songs];
                [newSongs[index], newSongs[index-1]] = [newSongs[index-1], newSongs[index]];
                updateDatabase(newSongs);
              }} style={{ padding: 8 }}><Ionicons name="chevron-up" size={20} color="white" /></TouchableOpacity>
              
              <TouchableOpacity onPress={() => {
                const newSongs = [...songs];
                [newSongs[index], newSongs[index+1]] = [newSongs[index+1], newSongs[index]];
                updateDatabase(newSongs);
              }} style={{ padding: 8 }}><Ionicons name="chevron-down" size={20} color="white" /></TouchableOpacity>
              
              <TouchableOpacity onPress={() => updateDatabase(songs.filter(s => s.id !== item.id))} style={{ padding: 8 }}>
                <Ionicons name="trash" size={20} color="red" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      
      <TouchableOpacity onPress={() => setIsSearching(true)} style={{ marginTop: 10, padding: 15, backgroundColor: '#15803d', borderRadius: 12 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>+ ДОДАТИ ПІСНЮ</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 10, padding: 15, backgroundColor: '#2563eb', borderRadius: 12 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>ГОТОВО</Text>
      </TouchableOpacity>
    </View>
  );
}