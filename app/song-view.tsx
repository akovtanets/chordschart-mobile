import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, LogBox, PanResponder, Platform, ScrollView, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { WebView } from 'react-native-webview';
import YoutubePlayer from "react-native-youtube-iframe";
import { supabase } from '../lib/supabase';

const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

LogBox.ignoreLogs(['[Reanimated]']);

// --- HTML-код движка Web Audio API з підтримкою пульсації та активації аудіо ---
const METRONOME_ENGINE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <script>
    let audioCtx = null;
    let isPlaying = false;
    let nextNoteTime = 0.0;
    let current16thNote = 0;
    let lookahead = 25.0;
    let scheduleAheadTime = 0.1;
    let timerID = null;

    let bpm = 120;
    let beatsPerMeasure = 4;
    let vols = { master: 0.8, accent: 1, q14: 0.8, q18: 0, q116: 0 };
    let solo = { click: false, accent: false, q14: false, q18: false, q116: false };

    function initAudio() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    function nextNote() {
      const secondsPerBeat = 60.0 / bpm;
      nextNoteTime += 0.25 * secondsPerBeat;
      current16thNote++;
      if (current16thNote === beatsPerMeasure * 4) {
        current16thNote = 0;
      }
    }

    function scheduleNote(beatNumber, time) {
      if (!vols) return;
      
      let channel = 'q116';
      let freq = 400; 
      
      if (beatNumber === 0) { channel = 'accent'; freq = 1200; } 
      else if (beatNumber % 4 === 0) { channel = 'q14'; freq = 800; } 
      else if (beatNumber % 2 === 0) { channel = 'q18'; freq = 600; } 

      const isAnySolo = solo.click || solo.accent || solo.q14 || solo.q18 || solo.q116;
      const isMuted = isAnySolo && !solo[channel] && !solo.click;
      
      if (!isMuted) {
        const masterVol = vols.master;
        const chanVol = vols[channel];
        const finalVol = masterVol * chanVol;

        if (finalVol > 0 && audioCtx) {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          osc.type = 'sine';
          osc.frequency.value = freq;
          
          gainNode.gain.setValueAtTime(finalVol, time);
          gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05); 
          
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc.start(time);
          osc.stop(time + 0.05);
        }
      }

      // Відправляємо сигнал пульсації в React Native на кожну чверть (або акцент)
      if (beatNumber % 4 === 0) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PULSE', isAccent: beatNumber === 0 }));
      }
    }

    function scheduler() {
      while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleNote(current16thNote, nextNoteTime);
        nextNote();
      }
      timerID = setTimeout(scheduler, lookahead);
    }

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'STATE') {
          initAudio();
          bpm = data.bpm || 120;
          beatsPerMeasure = data.timesig || 4;
          
          vols = {
            master: data.volumes.click / 100,
            accent: data.volumes.accent / 100,
            q14: data.volumes.q14 / 100,
            q18: data.volumes.q18 / 100,
            q116: data.volumes.q116 / 100
          };
          solo = data.solo;

          if (data.playing !== isPlaying) {
            isPlaying = data.playing;
            if (isPlaying) {
              current16thNote = 0;
              nextNoteTime = audioCtx.currentTime + 0.05;
              scheduler();
            } else {
              clearTimeout(timerID);
            }
          }
        }
      } catch(e) {}
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("message", handleMessage);
  </script>
</body>
</html>
`;

export default function SongViewScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const setlistId = Array.isArray(params.setlistId) ? params.setlistId[0] : params.setlistId; 
  
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

  const [prevSongId, setPrevSongId] = useState<string | null>(null);
  const [nextSongId, setNextSongId] = useState<string | null>(null);
  
  const [isClickActive, setIsClickActive] = useState(false);
  const [isMixerOpen, setIsMixerOpen] = useState(false);
  const [beatPulse, setBeatPulse] = useState(false); // Стан для пульсації кнопки
  
  const [mixerVolumes, setMixerVolumes] = useState({
    click: 80, accent: 100, q14: 80, q18: 0, q116: 0
  });

  const [soloChannels, setSoloChannels] = useState({
    click: false, accent: false, q14: false, q18: false, q116: false
  });

  const scrollViewRef = useRef<any>(null);
  const scrollY = useRef(0);
  const autoScrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<any>(null);
  const isUserScrolling = useRef(false);
  const webViewRef = useRef<any>(null); 

  const prevIdRef = useRef(prevSongId);
  const nextIdRef = useRef(nextSongId);

  useEffect(() => { prevIdRef.current = prevSongId; }, [prevSongId]);
  useEffect(() => { nextIdRef.current = nextSongId; }, [nextSongId]);

  useEffect(() => {
    if (id) {
      fetchSong();
      if (isFromSetlist && setlistId) fetchSetlistContext();
    }
    return () => {
      stopAutoScroll();
      setIsPlaying(false);
      setIsClickActive(false);
    };
  }, [id, setlistId]);

  // Синхронізація стейтів з WebView
  useEffect(() => {
    if (webViewRef.current) {
      const timesig = song?.timesig ? parseInt(song.timesig.split('/')[0]) : 4;
      const bpm = song?.bpm ? parseInt(song.bpm) : 120;
      
      const payload = JSON.stringify({
        type: 'STATE',
        playing: isClickActive,
        bpm: bpm,
        timesig: timesig,
        volumes: mixerVolumes,
        solo: soloChannels
      });

      webViewRef.current.postMessage(payload);
    }
  }, [isClickActive, mixerVolumes, soloChannels, song]);

  // Отримання повідомлень про пульсацію від WebView движка
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PULSE') {
        setBeatPulse(true);
        setTimeout(() => setBeatPulse(false), 80); // Швидкий спалах на кожен удар
      }
    } catch (e) {}
  };

  async function fetchSetlistContext() {
    try {
      const { data } = await supabase.from('setlists').select('song_ids').eq('id', setlistId).single();
      if (data?.song_ids) {
        const ids = data.song_ids;
        const currentIndex = ids.findIndex((sId: any) => String(sId) === String(id));
        if (currentIndex > 0) setPrevSongId(ids[currentIndex - 1]);
        else setPrevSongId(null);
        
        if (currentIndex >= 0 && currentIndex < ids.length - 1) setNextSongId(ids[currentIndex + 1]);
        else setNextSongId(null);
      }
    } catch (e) {
      console.error("Error fetching setlist context:", e);
    }
  }

  const goToSong = (targetId: string | null) => {
    if (!targetId) return;
    stopAutoScroll();
    setIsPlaying(false);
    setIsClickActive(false); 
    setCurrentTime(0);
    setDuration(0);
    
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    scrollY.current = 0;

    router.setParams({ id: targetId });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isHorizontal = Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        return isHorizontal;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 40) {
          if (prevIdRef.current) goToSong(prevIdRef.current);
        } else if (gestureState.dx < -40) {
          if (nextIdRef.current) goToSong(nextIdRef.current);
        }
      },
    })
  ).current;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
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
      const intervalMs = Math.max(12, (60000 / (bpm * 30.3))); 

      autoScrollInterval.current = setInterval(() => {
        if (!isUserScrolling.current) {
          scrollY.current += 0.5; 
          scrollViewRef.current?.scrollTo({ y: scrollY.current, animated: false });
        }
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
    const textWithoutChords = line.replace(/\[.*?\]/g, '').trim();
    const isChordsOnlyLine = line.trim().length > 0 && 
      (textWithoutChords.length === 0 || /^[\s\|\-\/]+$/.test(textWithoutChords));

    const parts = line.split(/(\[.*?\])/g);
    const fontSizes = [14, 18, 22];
    const chordSizes = [12, 16, 20];
    const margins = [16, 24, 32];
    const chordOffsets = [-18, -22, -26];

    const currentFont = fontSizes[fontSizeLevel];
    const currentChord = chordSizes[fontSizeLevel];
    const currentMargin = margins[fontSizeLevel];
    const currentOffset = chordOffsets[fontSizeLevel];

    if (isChordsOnlyLine) {
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: currentMargin }}>
          {parts.map((part, i) => {
            if (part.startsWith('[') && part.endsWith(']')) {
              const chord = transposeChord(part.slice(1, -1), semitones, capo);
              return (
                <Text key={i} style={{ color: '#3b82f6', fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: currentChord }}>
                  {chord}
                </Text>
              );
            }
            return (
              <Text key={i} style={{ color: '#3b82f6', fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: currentChord }}>
                {part}
              </Text>
            );
          })}
        </View>
      );
    }

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' }}>
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
    <View style={{ flex: 1, backgroundColor: '#09090b' }} {...panResponder.panHandlers}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View className="pt-12 pb-3 px-4 bg-[#18181b] flex-row items-center justify-between border-b border-zinc-800">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center py-2 pr-4">
          <Ionicons name="arrow-back" size={24} color="#3b82f6" />
          <Text className="text-white font-bold ml-1 text-base">Список</Text>
        </TouchableOpacity>

        <Text numberOfLines={1} className="text-white font-black text-sm uppercase tracking-wider flex-1 text-center mx-2">
          {song?.title}
        </Text>

        {isFromSetlist ? (
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={() => goToSong(prevSongId)} disabled={!prevSongId} style={{ opacity: prevSongId ? 1 : 0.3 }} className="p-2">
              <Ionicons name="chevron-back" size={24} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => goToSong(nextSongId)} disabled={!nextSongId} style={{ opacity: nextSongId ? 1 : 0.3 }} className="p-2">
              <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {isFromSetlist && (
        <View className="px-4 py-3 flex-row items-center justify-between border-b border-zinc-800/50 bg-blue-900/10">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => setFontSizeLevel(prev => Math.max(prev - 1, 0))} className="w-12 h-12 items-center justify-center bg-blue-900/40 rounded-full border border-blue-800/50">
              <Text className="text-blue-300 font-black text-xl">A-</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFontSizeLevel(prev => Math.min(prev + 1, 2))} className="w-12 h-12 items-center justify-center bg-blue-900/40 rounded-full border border-blue-800/50">
              <Text className="text-blue-300 font-black text-xl">A+</Text>
            </TouchableOpacity>
          </View>

          {videoId && (
            <View className="flex-1 mx-3 flex-row items-center bg-black/60 rounded-full h-12 px-4 border border-blue-900/30">
              <TouchableOpacity onPress={handleTogglePlay} className="w-9 h-9 items-center justify-center bg-blue-600 rounded-full">
                {playerStatus === "buffering" ? <ActivityIndicator size="small" color="white" /> : <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="white" />}
              </TouchableOpacity>
              <Slider
                style={{ flex: 1, height: 40, marginLeft: 8 }}
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

          <TouchableOpacity onPress={toggleAutoScroll} className={`w-20 h-12 rounded-2xl flex-col items-center justify-center border ${isAutoScrolling ? 'bg-blue-600 border-blue-500' : 'bg-blue-900/40 border-blue-800/50'}`}>
            <Ionicons name={isAutoScrolling ? "pause" : "chevron-down"} size={18} color={isAutoScrolling ? "white" : "#93c5fd"} />
            <Text className={`font-black text-[8px] uppercase tracking-tighter ${isAutoScrolling ? 'text-white' : 'text-blue-300'}`}>{isAutoScrolling ? 'Стоп' : 'Скролл'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ПАНЕЛЬ КЕРУВАННЯ МЕТРОНОМОМ З ПУЛЬСАЦІЄЮ КНОПКИ */}
      {isFromSetlist && (
        <View className="px-4 py-2.5 bg-[#0d0d0f] border-b border-zinc-800/80 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Ionicons name="pulse" size={18} color={isClickActive ? (beatPulse ? "#ef4444" : "#3b82f6") : "#52525b"} />
            <Text className="text-zinc-400 font-bold text-xs uppercase tracking-wider">Клік: {song?.bpm || 120} BPM</Text>
          </View>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity 
              onPress={() => setIsClickActive(!isClickActive)} 
              style={{
                backgroundColor: isClickActive ? (beatPulse ? '#ef4444' : '#2563eb') : '#18181b',
                borderColor: isClickActive ? '#f87171' : '#27272a',
                borderWidth: 1, paddingHorizontal: 20, height: 40, borderRadius: 12,
                flexDirection: 'row', alignItems: 'center', gap: 6
              }}
            >
              <Ionicons name={isClickActive ? "pause" : "play"} size={16} color={isClickActive ? "white" : "#a1a1aa"} />
              <Text style={{ color: isClickActive ? '#ffffff' : '#a1a1aa', fontWeight: '900', fontSize: 11, textTransform: 'uppercase' }}>
                {isClickActive ? 'Стоп' : 'Старт'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsMixerOpen(true)}
              style={{ backgroundColor: '#18181b', borderColor: '#27272a', borderWidth: 1, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="options" size={18} color="#a1a1aa" />
            </TouchableOpacity>
          </View>
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

      <ScrollView 
        ref={scrollViewRef} 
        className="flex-1" 
        scrollEnabled={true}
        style={{ zIndex: 1, backgroundColor: '#09090b' }} 
        onScrollBeginDrag={() => { isUserScrolling.current = true; }}
        onScrollEndDrag={() => { isUserScrolling.current = false; }}
        onMomentumScrollBegin={() => { isUserScrolling.current = true; }}
        onMomentumScrollEnd={() => { isUserScrolling.current = false; }}
        onScroll={(e) => {
          scrollY.current = Math.max(0, e.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={16} 
        contentContainerStyle={{ paddingBottom: 150 }}
      >
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
          {sections.map((section: any, idx: number) => (
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

      {/* МОДАЛЬНЕ ВІКНО МІКШЕРА */}
      {isMixerOpen && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#1c1c1e', borderColor: '#2c2c2e', borderWidth: 1, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.8, shadowRadius: 20 }}>
            
            <TouchableOpacity onPress={() => setIsMixerOpen(false)} style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
              <Ionicons name="close-circle" size={28} color="#52525b" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <View style={{ backgroundColor: '#151517', padding: 12, borderRadius: 16, alignItems: 'center', marginRight: 16 }}>
                <TouchableOpacity 
                  onPress={() => setSoloChannels(prev => ({...prev, click: !prev.click}))}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: soloChannels.click ? '#fbbf24' : '#27272a', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
                >
                  <Text style={{ color: soloChannels.click ? '#000' : '#71717a', fontSize: 12, fontWeight: '900' }}>S</Text>
                </TouchableOpacity>

                <View style={{ width: 60, height: 220, justifyContent: 'center', alignItems: 'center' }}>
                  <Slider
                    style={{ width: 200, height: 40, transform: [{ rotate: '-90deg' }] }}
                    minimumValue={0} maximumValue={100} value={mixerVolumes.click}
                    minimumTrackTintColor="#38bdf8" maximumTrackTintColor="#09090b" thumbTintColor="#3f3f46"
                    onValueChange={(val) => setMixerVolumes(prev => ({ ...prev, click: Math.round(val) }))}
                  />
                </View>
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '900', marginTop: 16 }}>Click</Text>
              </View>

              <View style={{ backgroundColor: '#1a1a1c', padding: 12, borderRadius: 16, flexDirection: 'row', gap: 12 }}>
                {( [
                  { key: 'accent', label: 'Accent' },
                  { key: 'q14', label: '1/4' },
                  { key: 'q18', label: '1/8' },
                  { key: 'q116', label: '1/16' }
                ] as { key: 'accent' | 'q14' | 'q18' | 'q116'; label: string }[] ).map((col) => (
                  <View key={col.key} style={{ alignItems: 'center', width: 50 }}>
                    <TouchableOpacity 
                      onPress={() => setSoloChannels(prev => ({...prev, [col.key]: !prev[col.key]}))}
                      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: soloChannels[col.key] ? '#fbbf24' : '#27272a', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
                    >
                      <Text style={{ color: soloChannels[col.key] ? '#000' : '#71717a', fontSize: 12, fontWeight: '900' }}>S</Text>
                    </TouchableOpacity>

                    <View style={{ width: 50, height: 220, justifyContent: 'center', alignItems: 'center' }}>
                      <Slider
                        style={{ width: 200, height: 40, transform: [{ rotate: '-90deg' }] }}
                        minimumValue={0} maximumValue={100} value={mixerVolumes[col.key]}
                        minimumTrackTintColor="#a1a1aa" maximumTrackTintColor="#09090b" thumbTintColor="#27272a"
                        onValueChange={(val) => setMixerVolumes(prev => ({ ...prev, [col.key]: Math.round(val) }))}
                      />
                    </View>
                    <Text style={{ color: mixerVolumes[col.key] > 0 ? '#e4e4e7' : '#52525b', fontSize: 11, fontWeight: '800', marginTop: 16 }}>
                      {col.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* СХОВАНИЙ WEBVIEW З ОБРОБКОЮ ПОВІДОМЛЕНЬ */}
      <View style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden', zIndex: -100 }}>
        <WebView 
          ref={webViewRef}
          source={{ html: METRONOME_ENGINE_HTML }}
          javaScriptEnabled={true}
          originWhitelist={['*']}
          mediaPlaybackRequiresUserAction={false}
          onMessage={handleWebViewMessage}
          style={{ width: 0, height: 0 }}
          containerStyle={{ width: 0, height: 0 }}
        />
      </View>

    </View>
  );
}