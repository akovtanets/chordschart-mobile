import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import YoutubePlayer from "react-native-youtube-iframe";
import { supabase } from '../lib/supabase';

export default function SetlistDetailsScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const rawTitle = Array.isArray(params.title) ? params.title[0] : params.title;
  
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playerStatus, setPlayerStatus] = useState<string>("unstarted");
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (id) fetchSongs();
  }, [id]);

  async function fetchSongs() {
    try {
      setLoading(true);
      const { data: setlist } = await supabase.from('setlists').select('song_ids').eq('id', id).single();
      if (!setlist?.song_ids) return setSongs([]);
      const { data: songsData } = await supabase.from('songs').select('*').in('id', setlist.song_ids);
      
      const sortedSongs = setlist.song_ids.map((sId: any) => 
        songsData?.find((s: any) => s.id === sId)
      ).filter(Boolean);

      setSongs(sortedSongs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleTogglePlay = (song: any) => {
    const videoId = song.youtube_url?.match(/(?:youtu\.be\/|youtube\.com\/(?:.*vExternal\/|v\/|u\/\w\/|embed\/|watch\?v=))([^#\&\?]*)/)?.[1];
    
    if (!videoId) return;

    if (playingId === song.id) {
      setPlayingId(null);
    } else {
      setActiveVideoId(videoId);
      setPlayingId(song.id);
    }
  };

  const handleStop = () => {
    setPlayingId(null);
    setActiveVideoId(null); 
  };

  const renderSongItem = ({ item }: { item: any }) => {
    const videoId = item.youtube_url?.match(/(?:youtu\.be\/|youtube\.com\/(?:.*vExternal\/|v\/|u\/\w\/|embed\/|watch\?v=))([^#\&\?]*)/)?.[1];
    const isCurrentActive = playingId === item.id;

    return (
      <View className="bg-zinc-800 p-5 rounded-[32px] mb-4 border border-zinc-700/50 flex-row items-center">
        <TouchableOpacity 
          onPress={() => router.push({ pathname: '/song-view', params: { id: item.id } } as any)}
          className="flex-1 mr-4"
        >
          <Text className="text-white text-xl font-black uppercase italic tracking-tighter leading-tight">
            {item.title}
          </Text>
          <Text className="text-zinc-500 text-[10px] font-bold mt-2 uppercase tracking-[0.2em]">
            {item.author || (videoId ? 'YOUTUBE AUDIO' : 'LYRICS ONLY')}
          </Text>
        </TouchableOpacity>

        {videoId && (
          <View className="flex-row items-center bg-zinc-900 p-2 rounded-2xl border border-zinc-700">
            <TouchableOpacity 
              onPress={() => handleTogglePlay(item)}
              className="w-11 h-11 items-center justify-center rounded-full bg-blue-600 shadow-lg"
            >
              {isCurrentActive && playerStatus === "buffering" ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name={isCurrentActive ? "pause" : "play"} size={22} color="white" />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleStop}
              className="ml-2 w-9 h-9 items-center justify-center bg-zinc-800 rounded-full border border-zinc-700"
            >
              <Ionicons name="stop" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      <Stack.Screen options={{ 
        headerShown: true,
        title: (rawTitle || "СЕТЛИСТ").toUpperCase(),
        headerStyle: { backgroundColor: '#18181b' }, 
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '900', fontSize: 16 },
        headerBackTitle: "Назад",
        headerBackTitleVisible: true,
        headerShadowVisible: false,
        headerTransparent: false,
      }} />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0090ff" />
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          renderItem={renderSongItem}
        />
      )}

      {/* Перемістив плеєр у кінець */}
      <View style={styles.hiddenPlayerContainer} pointerEvents="none">
        <YoutubePlayer
          ref={playerRef}
          height={100}
          width={100}
          videoId={activeVideoId || ""}
          play={playingId !== null}
          onChange={(state: string) => setPlayerStatus(state)}
          initialPlayerVars={{
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenPlayerContainer: {
    position: 'absolute',
    bottom: -100, // Внизу за межами екрана
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  }
});