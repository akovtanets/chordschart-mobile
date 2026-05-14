import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, LayoutAnimation, LogBox, Platform, Text, TouchableOpacity, UIManager, View } from 'react-native';
import YoutubePlayer from "react-native-youtube-iframe";
import { supabase } from '../lib/supabase';

LogBox.ignoreLogs(['[Reanimated]']);
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('[Reanimated]')) return;
  originalWarn(...args);
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SetlistDetailsScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const rawTitle = Array.isArray(params.title) ? params.title[0] : params.title;
  
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playerStatus, setPlayerStatus] = useState<string>("unstarted");
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (id) fetchSongs();
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !isScrubbing && playerStatus === "playing") {
      interval = setInterval(async () => {
        try {
          const time = await playerRef.current?.getCurrentTime();
          const dur = await playerRef.current?.getDuration();
          if (time !== undefined) setCurrentTime(time);
          if (dur !== undefined && duration === 0) setDuration(dur);
        } catch (e) {}
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isScrubbing, duration, playerStatus]);

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

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (activeSongId === song.id) {
      if (isPlaying) {
        // ЯДЕРНА ПАУЗА: Просто вимикаємо isPlaying. Плеєр ЗНИЩИТЬСЯ, звук обірветься миттєво.
        setIsPlaying(false);
        setPlayerStatus("paused"); 
      } else {
        // Знімаємо з паузи: плеєр створиться заново
        setIsPlaying(true);
        setPlayerStatus("buffering");
      }
    } else {
      setActiveSongId(song.id);
      setActiveVideoId(videoId);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(0);
      setPlayerStatus("buffering");
    }
  };

  const handleStop = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsPlaying(false);
    setActiveSongId(null);
    setActiveVideoId(null); 
    setPlayerStatus("unstarted");
    setCurrentTime(0);
  };

  const renderSongItem = ({ item }: { item: any }) => {
    const videoId = item.youtube_url?.match(/(?:youtu\.be\/|youtube\.com\/(?:.*vExternal\/|v\/|u\/\w\/|embed\/|watch\?v=))([^#\&\?]*)/)?.[1];
    const isCurrentActive = activeSongId === item.id;

    return (
      <View className="bg-zinc-800 p-5 rounded-[32px] mb-4 border border-zinc-700/50">
        
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.push({ pathname: '/song-view', params: { id: item.id } } as any)}
            className="flex-1 mr-4"
          >
            <Text className={`text-xl font-black uppercase italic tracking-tighter leading-tight ${isCurrentActive ? 'text-blue-400' : 'text-white'}`}>
              {item.title}
            </Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-2 uppercase tracking-[0.2em]">
              {item.author || (videoId ? 'AUDIO AVAILABLE' : 'LYRICS ONLY')}
            </Text>
          </TouchableOpacity>

          {videoId && !isCurrentActive && (
            <TouchableOpacity 
              onPress={() => handleTogglePlay(item)}
              className="w-11 h-11 items-center justify-center rounded-full bg-zinc-700 shadow-lg"
            >
              <Ionicons name="play" size={22} color="white" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          )}
        </View>

        {isCurrentActive && (
          <View className="mt-4 flex-row items-center bg-zinc-900 p-2 rounded-2xl border border-zinc-700">
            <TouchableOpacity 
              onPress={() => handleTogglePlay(item)}
              className="w-11 h-11 items-center justify-center rounded-full bg-blue-600 shadow-lg"
            >
              {playerStatus === "buffering" ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons 
                  name={isPlaying ? "pause" : "play"} 
                  size={22} 
                  color="white" 
                  style={!isPlaying && { marginLeft: 3 }} 
                />
              )}
            </TouchableOpacity>

            <Slider
              style={{ flex: 1, height: 40, marginHorizontal: 10 }}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 100}
              value={currentTime}
              minimumTrackTintColor="#2563eb"
              maximumTrackTintColor="#52525b"
              thumbTintColor="#ffffff"
              onSlidingStart={() => setIsScrubbing(true)}
              onValueChange={(val) => setCurrentTime(val)}
              onSlidingComplete={(val) => {
                setIsScrubbing(false);
                if (isPlaying) {
                  playerRef.current?.seekTo(val, true);
                } else {
                  // Якщо перемотали на паузі, просто зберігаємо час
                  setCurrentTime(val);
                }
              }}
            />

            <TouchableOpacity 
              onPress={handleStop}
              className="w-9 h-9 items-center justify-center bg-zinc-800 rounded-full border border-zinc-700 active:bg-zinc-700"
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
        headerShadowVisible: false,
      }} />

      {/* 
        СЛОЙ 0: ВІДЕОПЛЕЄР
        УВАГА: Плеєр рендериться ТІЛЬКИ коли isPlaying === true.
        Коли ти натискаєш Паузу, цей блок зникає, забираючи з собою звук!
      */}
      {activeVideoId && isPlaying && (
        <View style={{ position: 'absolute', top: 50, left: 0, right: 0, height: 300, zIndex: 0 }} pointerEvents="none">
          <YoutubePlayer
            ref={playerRef}
            height={300}
            videoId={activeVideoId}
            play={true} // Завжди true, коли змонтовано
            onReady={() => {
              // МАГІЯ ВІДНОВЛЕННЯ:
              // Коли плеєр створюється після паузи, він відразу стрибає на збережений час
              if (currentTime > 0) {
                playerRef.current?.seekTo(currentTime, true);
              } else {
                playerRef.current?.seekTo(0, true);
              }
            }}
            onChangeState={(state: string) => {
              setPlayerStatus(state);
              if (state === "ended") {
                setIsPlaying(false);
                setCurrentTime(0);
              }
            }}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false, 
            }}
            initialPlayerVars={{
              autoplay: 1, // Дозволяємо автоплей при створенні
              controls: 0,
              modestbranding: 1,
              playsinline: 1,
              rel: 0
            }}
          />
        </View>
      )}

      {/* СЛОЙ 1: ІНТЕРФЕЙС, ЩО ПЕРЕКРИВАЄ ВІДЕО */}
      <View style={{ flex: 1, backgroundColor: '#111', zIndex: 1 }}>
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
      </View>
    </View>
  );
}