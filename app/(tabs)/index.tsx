import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router'; // Змінено тут
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { supabase } from '../../lib/supabase';

// Локалізація
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

  useEffect(() => {
    fetchSetlists();
  }, []);

  const fetchSetlists = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('setlists').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      setAllSetlists(data || []);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoading(false);
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
      {/* Шапка */}
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

      <Modal visible={showCalendar} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowCalendar(false)}>
          <View className="flex-1 justify-center items-center bg-black/60 px-6">
            <TouchableWithoutFeedback>
              <View className="bg-zinc-900 w-full max-w-[400px] rounded-[40px] overflow-hidden border border-zinc-800 shadow-2xl">
                <View className="p-4 border-b border-zinc-800 items-center">
                  <Text className="text-white font-black uppercase text-xs tracking-widest">Оберіть дату</Text>
                </View>
                <Calendar
                  theme={{
                    calendarBackground: '#18181b',
                    textSectionTitleColor: '#52525b',
                    selectedDayBackgroundColor: '#0090ff',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#0090ff',
                    dayTextColor: '#d4d4d8',
                    textDisabledColor: '#3f3f46',
                    dotColor: '#0090ff',
                    monthTextColor: '#ffffff',
                    arrowColor: '#0090ff',
                    textDayFontWeight: '600',
                    textMonthFontWeight: '900',
                    textDayHeaderFontWeight: '800',
                  }}
                  onDayPress={day => {
                    setSelectedDate(day.dateString);
                    setShowCalendar(false);
                  }}
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

      {loading ? (
        <ActivityIndicator size="large" color="#0090ff" className="mt-20" />
      ) : (
        <FlatList
          data={filteredSetlists}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => router.push({ pathname: "/setlist-details", params: { id: item.id, title: item.title } } as any)}
              className="bg-zinc-800 p-7 rounded-[35px] mb-5 border border-zinc-700/50 flex-row items-center justify-between active:scale-[0.97]"
            >
              <View className="flex-1">
                <Text className="text-white text-2xl font-black uppercase italic tracking-tighter leading-none">{item.title}</Text>
                <View className="flex-row items-center mt-4">
                  <View className="bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                    <Text className="text-[#0090ff] text-[9px] font-black uppercase tracking-widest">Переглянути пісні</Text>
                  </View>
                </View>
              </View>
              <View className="bg-zinc-900 w-14 h-14 rounded-full items-center justify-center border border-zinc-700 shadow-sm">
                <Ionicons name="chevron-forward" size={24} color="#0090ff" />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="mt-20 items-center px-10">
              <Ionicons name="calendar-clear-outline" size={60} color="#27272a" />
              <Text className="text-zinc-600 text-center mt-6 italic font-medium leading-6">
                На обрану дату планів немає.{"\n"}Спробуйте знайти день із синьою точкою.
              </Text>
              <TouchableOpacity 
                onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="mt-8 bg-zinc-800 px-8 py-4 rounded-2xl border border-zinc-700"
              >
                <Text className="text-[#0090ff] font-black uppercase text-[10px] tracking-widest">На сьогодні</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}