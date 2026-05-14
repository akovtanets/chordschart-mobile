import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, LayoutAnimation, Modal, Platform, Text, TouchableOpacity, TouchableWithoutFeedback, UIManager, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { supabase } from '../../lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

LocaleConfig.locales['uk'] = {
  monthNames: ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'],
  monthNamesShort: ['Січ.','Лют.','Бер.','Квіт.','Трав.','Черв.','Лип.','Серп.','Вер.','Жовт.','Лист.','Груд.'],
  dayNames: ['Неділя','Понеділок','Вівторок','Середа','Четвер','П\'ятниця','Субота'],
  dayNamesShort: ['Нд','Пн','Вв','Ср','Чт','Пт','Сб'],
  today: "Сьогодні"
};
LocaleConfig.defaultLocale = 'uk';

export default function SetlistsScreen() {
  const [allSetlists, setAllSetlists] = useState<any[]>([]); 
  const [filteredSetlists, setFilteredSetlists] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCalendar, setShowCalendar] = useState(false);

  const [teams, setTeams] = useState<any[]>([]);
  const [isTeamModalVisible, setIsTeamModalVisible] = useState(false);
  const [activeSetlist, setActiveSetlist] = useState<any>(null);
  const [tempShared, setTempShared] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Отримуємо команди де користувач є лідером/адміном
      const { data: teamMemberships } = await supabase
        .from("team_members")
        .select("team_id, teams(id, name)")
        .eq("user_id", user.id)
        .or('role.ilike.leader,role.ilike.admin');
      
      if (teamMemberships) {
        setTeams(teamMemberships.map((m: any) => m.teams).filter(Boolean));
      }

      const { data, error } = await supabase
        .from('setlists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllSetlists(data || []);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShareToTeam = async (teamId: string) => {
    if (!activeSetlist) return;
    try {
      const { error } = await supabase
        .from("setlists")
        .update({ is_team_shared: true, team_id: teamId })
        .eq("id", activeSetlist.id);

      if (error) throw error;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAllSetlists(prev => prev.map(s => 
        s.id === activeSetlist.id ? { ...s, is_team_shared: true, team_id: teamId } : s
      ));
      setIsTeamModalVisible(false);
    } catch (e: any) {
      Alert.alert("Помилка", e.message);
    }
  };

  const handleUnshare = async (setlist: any) => {
    try {
      const { error } = await supabase
        .from("setlists")
        .update({ is_team_shared: false, team_id: null })
        .eq("id", setlist.id);

      if (error) throw error;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAllSetlists(prev => prev.map(s => 
        s.id === setlist.id ? { ...s, is_team_shared: false, team_id: null } : s
      ));
      setTempShared(false);
    } catch (e: any) {
      Alert.alert("Помилка", e.message);
    }
  };

  const markedDates = useMemo(() => {
    const marks: any = {};
    allSetlists.forEach(item => {
      const match = item.title?.match(/(\d{1,2})\.(\d{2})\.(\d{4})/);
      if (match) {
        const isoDate = `${match[3]}-${match[2]}-${match[1].padStart(2, '0')}`;
        marks[isoDate] = { marked: true, dotColor: '#0090ff' };
      }
    });
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#0090ff' };
    return marks;
  }, [allSetlists, selectedDate]);

  useEffect(() => {
    const [y, m, d] = selectedDate.split('-');
    const searchStr = `${parseInt(d)}.${m}.${y}`;
    const filtered = allSetlists.filter(item => item.title?.includes(searchStr));
    setFilteredSetlists(filtered);
  }, [selectedDate, allSetlists]);

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-4">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-8">
        <View>
          <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Мій розклад</Text>
          <Text className="text-white text-4xl font-black uppercase italic tracking-tighter">Сетлисти</Text>
        </View>

        <TouchableOpacity 
          onPress={() => setShowCalendar(true)}
          className="bg-zinc-800 flex-row items-center px-5 py-3.5 rounded-2xl border border-zinc-700 active:bg-zinc-700"
        >
          <Ionicons name="calendar-outline" size={20} color="#0090ff" />
          <Text className="text-white font-black ml-3 text-sm tracking-tight">
            {new Date(selectedDate).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* MODAL Календаря */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowCalendar(false)}>
          <View className="flex-1 justify-center items-center bg-black/60 px-6">
            <TouchableWithoutFeedback>
              <View className="bg-zinc-900 w-full max-w-[400px] rounded-[40px] overflow-hidden border border-zinc-800 shadow-2xl">
                <Calendar
                  theme={{
                    calendarBackground: '#18181b',
                    textSectionTitleColor: '#52525b',
                    selectedDayBackgroundColor: '#0090ff',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#0090ff',
                    dayTextColor: '#d4d4d8',
                    monthTextColor: '#ffffff',
                    arrowColor: '#0090ff',
                  }}
                  onDayPress={day => { setSelectedDate(day.dateString); setShowCalendar(false); }}
                  markedDates={markedDates}
                  firstDay={1}
                />
                <TouchableOpacity onPress={() => setShowCalendar(false)} className="bg-zinc-800 p-5 items-center">
                  <Text className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Закрити</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL Вибору команди */}
      <Modal visible={isTeamModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-end bg-black/60">
          <TouchableWithoutFeedback onPress={() => setIsTeamModalVisible(false)}><View className="flex-1" /></TouchableWithoutFeedback>
          <View className="bg-zinc-900 p-8 rounded-t-[40px] border-t border-zinc-800 shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-white text-xl font-black uppercase italic">Доступ команди</Text>
              <TouchableOpacity onPress={() => setIsTeamModalVisible(false)}><Ionicons name="close-circle" size={28} color="#3f3f46" /></TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                if (tempShared) { handleUnshare(activeSetlist); setIsTeamModalVisible(false); } 
                else { setTempShared(true); }
              }}
              className={`flex-row items-center p-5 rounded-2xl border mb-6 ${tempShared ? 'bg-blue-600/10 border-blue-500/50' : 'bg-zinc-800 border-zinc-700'}`}
            >
              <View className={`w-6 h-6 rounded-md border-2 items-center justify-center ${tempShared ? 'bg-blue-500 border-blue-500' : 'border-zinc-500'}`}>
                {tempShared && <Ionicons name="checkmark" size={18} color="white" />}
              </View>
              <Text className="text-white font-bold ml-4 text-base">Поділитися з командою</Text>
            </TouchableOpacity>

            {tempShared && (
              <View>
                <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4 ml-1">Оберіть команду:</Text>
                {teams.map(team => (
                  <TouchableOpacity 
                    key={team.id}
                    onPress={() => handleShareToTeam(team.id)}
                    className={`p-5 rounded-2xl mb-3 border flex-row justify-between items-center ${activeSetlist?.team_id === team.id ? 'bg-blue-600 border-blue-400' : 'bg-zinc-800 border-zinc-700'}`}
                  >
                    <Text className="text-white font-bold">{team.name}</Text>
                    <Ionicons name={activeSetlist?.team_id === team.id ? "radio-button-on" : "chevron-forward"} size={18} color="white" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View className="h-6" />
          </View>
        </View>
      </Modal>

      {loading ? (
        <ActivityIndicator size="large" color="#0090ff" className="mt-20" />
      ) : (
        <FlatList
          data={filteredSetlists}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isOwner = item.user_id === currentUserId;
            // ЗНАХОДИМО НАЗВУ КОМАНДИ
            const teamName = teams.find(t => t.id === item.team_id)?.name || "Shared";

            return (
              <TouchableOpacity 
                onPress={() => router.push({ pathname: "/setlist-details", params: { id: item.id, title: item.title } } as any)}
                className="bg-zinc-800 p-7 rounded-[35px] mb-5 border border-zinc-700/50 flex-row items-center justify-between"
              >
                <View className="flex-1 mr-4">
                  <Text className="text-white text-2xl font-black uppercase italic tracking-tighter leading-none">{item.title}</Text>
                  {item.is_team_shared && (
                    <View className="bg-blue-500/10 self-start px-3 py-1 rounded-full border border-blue-500/20 mt-3 flex-row items-center gap-1">
                      <Ionicons name="people" size={10} color="#0090ff" />
                      {/* ВИВОДИМО НАЗВУ КОМАНДИ ЗАМІСТЬ SHARED */}
                      <Text className="text-[#0090ff] text-[9px] font-black uppercase tracking-widest">{teamName}</Text>
                    </View>
                  )}
                </View>

                {isOwner && teams.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => { setActiveSetlist(item); setTempShared(item.is_team_shared); setIsTeamModalVisible(true); }}
                    className={`w-14 h-14 rounded-full items-center justify-center border-2 ${item.is_team_shared ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 bg-zinc-900'}`}
                  >
                    <Ionicons name="people" size={24} color={item.is_team_shared ? "#0090ff" : "#3f3f46"} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<View className="mt-20 items-center px-10"><Text className="text-zinc-600 text-center italic font-medium">На обрану дату планів немає.</Text></View>}
        />
      )}
    </View>
  );
}