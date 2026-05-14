import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, LogBox, Platform, ScrollView, Text, TouchableOpacity, UIManager, View } from 'react-native';
import YoutubePlayer from "react-native-youtube-iframe";
import { supabase } from '../lib/supabase';

const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

LogBox.ignoreLogs(['[Reanimated]']);

export default function SongViewScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  
  const isFromSetlist = source === 'setlist';

  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [semitones, setSemitones] = useState(0);
  const [capo, setCapo] = useState(0);
  
  const [fontSizeLevel, setFontSizeLevel] = useState(1);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playerStatus, setPlayerStatus] = useState("unstarted");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const autoScrollInterval = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (id) fetchSong();
    return () => {
      stopAutoScroll();
      setIsPlaying(false);
    };
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && playerStatus === "playing") {
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
  }, [isPlaying, playerStatus, duration]);

  async function fetchSong() {
    try {
      setLoading(true);
      // ВИПРАВЛЕНО: додано назву колонки 'id'
      const { data, error } = await supabase.from('songs').select('*').eq('id', id).single();
      if (error) throw error;
      setSong(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const toggleSettings = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSettingsOpen(!isSettingsOpen);
  };

  const toggleAutoScroll = () => {
    if (isAutoScrolling) {
      stopAutoScroll();
    } else {
      setIsAutoScrolling(true);
      const bpm = song?.bpm ? parseInt(song.bpm) : 120;
      const intervalMs = Math.max(20, (60000 / (bpm * 13.5))); 
      autoScrollInterval.current = setInterval(() => {
        scrollY.current += 0.5;
        scrollViewRef.current?.scrollTo({ y: scrollY.current, animated: false });
      }, intervalMs);
    }
  };

  const stopAutoScroll = () => {
    setIsAutoScrolling(false);
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };

  const handleTogglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (nextState && currentTime > 0) {
      setTimeout(() => playerRef.current?.seekTo(currentTime, true), 100);
    }
  };

  const transposeChord = (chord: string, delta: number, capoOffset: number): string => {
    return chord.replace(/([A-G][b#]?)/g, (match) => {
      let note = match.replace("A#", "Bb").replace("C#", "Db").replace("D#", "Eb").replace("F#", "Gb").replace("G#", "Ab");
      const index = NOTES.indexOf(note);
      if (index === -1) return match;
      const finalDelta = delta - capoOffset;
      return NOTES[(index + finalDelta + 120) % 12];
    });
  };

  const renderLineContent = (line: string) => {
    const parts = line.split(/(\[.*?\])/g);
    const fontSizes = [14, 18, 22];
    const chordSizes = [12, 16, 20];
    const margins = [16, 24, 32];
    const chordOffsets = [-18, -22, -26];

    const currentFont = fontSizes[fontSizeLevel];
    const currentChord = chordSizes[fontSizeLevel];
    const currentMargin = margins[fontSizeLevel];
    const currentOffset = chordOffsets[fontSizeLevel];

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: line.trim().startsWith('[') ? 24 : 4, marginBottom: currentMargin }}>
        {parts.map((part, i) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const chord = transposeChord(part.slice(1, -1), semitones, capo);
            return (
              <View key={i} style={{ width: (line.trim().length > 0 && line.replace(/\[.*?\]/g, '').trim().length === 0) ? undefined : 0, marginRight: (line.trim().length > 0 && line.replace(/\[.*?\]/g, '').trim().length === 0) ? 8 : 0, position: 'relative', overflow: 'visible' }}>
                <Text style={{ position: 'absolute', top: currentOffset, left: 0, color: '#3b82f6', fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: currentChord }}>
                  {chord}
                </Text>
              </View>
            );
          }
          return (
            <Text key={i} style={{ color: '#e4e4e7', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: currentFont, lineHeight: currentFont * 1.2 }}>
              {part}
            </Text>
          );
        })}
      </View>
    );
  };

  // Перевірка завантаження перенесена вище основного рендеру
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' }}>
         <Stack.Screen options={{ title: 'Завантаження...' }} />
         <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!song) return null;

  const rawContent: string = song?.content || "";
  const sections = rawContent.split("\n\n").map((s: string) => {
    const lines = s.split("\n");
    const rawHeader = lines[0].toUpperCase().replace(/[:]/g, "").trim();
    const translationMap: Record<string, string> = { "INTRO": "ВСТУП", "VERSE": "КУПЛЕТ", "CHORUS": "ПРИСПІВ", "BRIDGE": "БРІДЖ", "OUTRO": "КІНЕЦЬ", "SOLO": "СОЛО", "INSTRUMENTAL": "ПРОГРАШ", "INTERLUDE": "ВСТАВКА", "TAG": "ТЕГ", "PRE-CHORUS": "ПЕРЕД-ПРИСПІВ" };
    let finalHeader = rawHeader;
    let isHeader = false;
    const keywords = ["ВСТУП", "КУПЛЕТ", "ПРИСПІВ", "БРІДЖ", "ВСТАВКА", "КІНЕЦЬ", "ПРОГРАШ", "СОЛО", "ТЕГ", ...Object.keys(translationMap)];
    if (keywords.some(k => rawHeader.includes(k))) {
      isHeader = true;
      Object.entries(translationMap).forEach(([en, ua]) => { if (finalHeader.includes(en)) finalHeader = finalHeader.replace(en, ua); });
    }
    return { type: isHeader ? finalHeader : "СЕКЦІЯ", lines: isHeader ? lines.slice(1) : lines };
  });

  const videoId = song?.youtube_url?.match(/(?:youtu\.be\/|youtube\.com\/(?:.*vExternal\/|v\/|u\/\w\/|embed\/|watch\?v=))([^#\&\?]*)/)?.[1];

  return (
    <View style={{ flex: 1, backgroundColor: '#09090b' }}>
      <Stack.Screen options={{ headerShown: true, title: song?.title?.toUpperCase(), headerStyle: { backgroundColor: '#18181b' }, headerTintColor: '#fff', headerBackTitle: "Назад", headerShadowVisible: false }} />

      {isFromSetlist && (
        <View className="px-4 py-4 flex-row items-center justify-between border-b border-zinc-800/50 bg-blue-900/10">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => setFontSizeLevel(prev => Math.max(prev - 1, 0))} className="w-14 h-14 items-center justify-center bg-blue-900/40 rounded-full border border-blue-800/50">
              <Text className="text-blue-300 font-black text-2xl">A-</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFontSizeLevel(prev => Math.min(prev + 1, 2))} className="w-14 h-14 items-center justify-center bg-blue-900/40 rounded-full border border-blue-800/50">
              <Text className="text-blue-300 font-black text-2xl">A+</Text>
            </TouchableOpacity>
          </View>

          {videoId && (
            <View className="flex-1 mx-4 flex-row items-center bg-black/60 rounded-full h-14 px-5 border border-blue-900/30">
              <TouchableOpacity onPress={handleTogglePlay} className="w-10 h-10 items-center justify-center bg-blue-600 rounded-full">
                {playerStatus === "buffering" ? <ActivityIndicator size="small" color="white" /> : <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="white" />}
              </TouchableOpacity>
              <Slider
                style={{ flex: 1, height: 40, marginLeft: 12 }}
                minimumValue={0}
                maximumValue={duration > 0 ? duration : 100}
                value={currentTime}
                minimumTrackTintColor="#2563eb"
                maximumTrackTintColor="#3f3f46"
                thumbTintColor="#fff"
                onSlidingComplete={(val) => {
                  playerRef.current?.seekTo(val, true);
                  if (!isPlaying) setIsPlaying(true);
                }}
              />
            </View>
          )}

          <TouchableOpacity onPress={toggleAutoScroll} className={`w-24 h-14 rounded-3xl flex-col items-center justify-center border ${isAutoScrolling ? 'bg-blue-600 border-blue-500' : 'bg-blue-900/40 border-blue-800/50'}`}>
            <Ionicons name={isAutoScrolling ? "pause" : "chevron-down"} size={20} color={isAutoScrolling ? "white" : "#93c5fd"} />
            <Text className={`font-black text-[9px] uppercase tracking-tighter ${isAutoScrolling ? 'text-white' : 'text-blue-300'}`}>{isAutoScrolling ? 'Стоп' : 'Скролл'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {videoId && isPlaying && (
        <View style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0.01, zIndex: -1 }}>
          <YoutubePlayer
            ref={playerRef}
            height={200}
            width={300}
            videoId={videoId}
            play={true}
            onReady={() => playerRef.current?.seekTo(currentTime, true)}
            onChangeState={setPlayerStatus}
            initialPlayerVars={{ autoplay: 1, controls: 0, playsinline: 1 }}
          />
        </View>
      )}

      <ScrollView ref={scrollViewRef} className="flex-1" style={{ zIndex: 1, backgroundColor: '#09090b' }} onScrollBeginDrag={stopAutoScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 150 }}>
        <View className="px-5 pt-8 pb-4 bg-[#0a0c10]">
          <Text className="text-3xl font-black text-white uppercase tracking-tighter leading-tight mb-1">{song?.title}</Text>
          <Text className="text-zinc-500 font-bold uppercase tracking-[0.1em] mb-4">{song?.author || "Невідомий автор"}</Text>

          <TouchableOpacity onPress={toggleSettings} className={`flex-row items-center justify-between px-5 py-4 rounded-2xl border ${isSettingsOpen ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-900 border-zinc-800'}`}>
            <View className="flex-row items-center gap-2">
              <Ionicons name="options-outline" size={20} color={isSettingsOpen ? "#3b82f6" : "#71717a"} />
              <Text className={`font-black text-xs uppercase tracking-widest ${isSettingsOpen ? 'text-blue-400' : 'text-zinc-500'}`}>Налаштування</Text>
            </View>
            <Ionicons name={isSettingsOpen ? "chevron-up" : "chevron-down"} size={20} color="#71717a" />
          </TouchableOpacity>

          {isSettingsOpen && (
            <View className="mt-4">
              <View className="flex-row items-center justify-between bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800 mb-4">
                <View className="flex-row items-center gap-3">
                  <Text className="text-zinc-500 font-black text-[10px] uppercase">Тон</Text>
                  <TouchableOpacity onPress={() => setSemitones(s => s - 1)} className="bg-zinc-800 w-12 h-12 items-center justify-center rounded-full border border-zinc-700"><Text className="text-white font-bold text-2xl">-</Text></TouchableOpacity>
                  <Text className="text-white font-black text-xl w-8 text-center">{semitones > 0 ? `+${semitones}` : semitones}</Text>
                  <TouchableOpacity onPress={() => setSemitones(s => s + 1)} className="bg-zinc-800 w-12 h-12 items-center justify-center rounded-full border border-zinc-700"><Text className="text-white font-bold text-2xl">+</Text></TouchableOpacity>
                </View>
                <View className="flex-row items-center gap-3">
                  <Text className="text-zinc-500 font-black text-[10px] uppercase">Капо</Text>
                  <TouchableOpacity onPress={() => setCapo(c => Math.max(0, c - 1))} className="bg-zinc-800 w-12 h-12 items-center justify-center rounded-full border border-zinc-700"><Text className="text-white font-bold text-2xl">-</Text></TouchableOpacity>
                  <Text className="text-white font-black text-xl w-6 text-center">{capo}</Text>
                  <TouchableOpacity onPress={() => setCapo(c => c + 1)} className="bg-zinc-800 w-12 h-12 items-center justify-center rounded-full border border-zinc-700"><Text className="text-white font-bold text-2xl">+</Text></TouchableOpacity>
                </View>
              </View>
              <View className="flex-row justify-between">
                {[
                  { label: "ТОН", val: transposeChord(song?.default_key || "C", semitones, 0), color: "text-blue-400" },
                  { label: "ТЕМП", val: song?.bpm || "—" },
                  { label: "РОЗМІР", val: song?.timesig || "—" },
                  { label: "КАПО", val: capo > 0 ? capo : "Ø" },
                  { label: "ЧАС", val: song?.length || "—" }
                ].map((attr, idx) => (
                  <View key={idx} style={{ width: '19.2%' }} className="bg-zinc-900 border border-zinc-800 py-4 rounded-2xl items-center justify-center">
                    <Text numberOfLines={1} className="text-zinc-500 text-[7px] uppercase font-black mb-1 text-center">{attr.label}</Text>
                    <Text numberOfLines={1} className={`font-black font-mono text-sm ${attr.color ? attr.color : 'text-white'}`}>{attr.val}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View className="px-5 pt-4 flex flex-col gap-6">
          {sections.map((section, idx) => (
            <View key={idx} className="bg-[#0a0c10] border border-zinc-900 p-8 rounded-[40px] shadow-2xl">
              <View className="flex-row items-center gap-4 mb-8">
                <Text className="text-blue-500 text-[14px] font-black uppercase tracking-[0.5em] italic">{section.type}</Text>
                <View className="h-[1px] flex-1 bg-blue-900/40" />
              </View>
              <View className="flex-col">{section.lines.map((line: string, lIdx: number) => (<View key={lIdx}>{renderLineContent(line)}</View>))}</View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}