import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

const ROLE_NAMES: Record<string, string> = {
  leader: "Лідер",
  vocalist: "Вокаліст",
  musician: "Музикант",
  sound_engineer: "Звукорежисер"
};

const ROLES_LIST = Object.entries(ROLE_NAMES).map(([id, label]) => ({ id, label }));

export default function TeamScreen() {
  const [loading, setLoading] = useState(true);
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [activeTeam, setActiveTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Стан для редагування ролі
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    initTeamData();
  }, []);

  async function initTeamData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: owned } = await supabase.from("teams").select("*").eq("owner_id", user.id);
      const { data: memberOf } = await supabase.from("team_members").select("teams(*)").eq("user_id", user.id);

      const allTeamsMap = new Map();
      owned?.forEach(t => allTeamsMap.set(t.id, t));
      memberOf?.forEach(m => {
        const tData = Array.isArray(m.teams) ? m.teams[0] : m.teams;
        if (tData) allTeamsMap.set(tData.id, tData);
      });

      const allTeams = Array.from(allTeamsMap.values());
      setUserTeams(allTeams);

      if (allTeams.length > 0) {
        const firstTeam = allTeams[0];
        setActiveTeam(firstTeam);
        await fetchMembers(firstTeam.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMembers(teamId: string) {
    const { data } = await supabase
      .from("team_members_with_emails")
      .select("*")
      .eq("team_id", teamId);
    setMembers(data || []);
  }

  const handleUpdateRole = async (newRole: string) => {
    if (!selectedMember) return;
    
    setUpdatingRole(true);
    try {
      // Оновлюємо роль у таблиці team_members за id запису (не user_id)
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("id", selectedMember.id);

      if (error) throw error;

      // Оновлюємо локальний стан
      setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, role: newRole } : m));
      setIsRoleModalOpen(false);
    } catch (err: any) {
      Alert.alert("Помилка", err.message);
    } finally {
      setUpdatingRole(false);
      setSelectedMember(null);
    }
  };

  const isOwner = activeTeam?.owner_id === userId;

  return (
    <View className="flex-1 bg-zinc-900 px-4">
      <Stack.Screen options={{ 
        title: activeTeam?.name || 'Команда',
        headerShown: true, 
        headerStyle: { backgroundColor: '#18181b' }, 
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerBackTitle: 'Назад',
      }} />

      {userTeams.length > 1 && (
        <View className="py-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {userTeams.map(t => (
              <TouchableOpacity 
                key={t.id}
                onPress={async () => {
                  setActiveTeam(t);
                  await fetchMembers(t.id);
                }}
                className={`mr-3 px-4 py-2 rounded-full border ${activeTeam?.id === t.id ? 'bg-blue-600 border-blue-500' : 'bg-zinc-800 border-zinc-700'}`}
              >
                <Text className={`font-bold ${activeTeam?.id === t.id ? 'text-white' : 'text-zinc-400'}`}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <View className="mt-4 mb-6">
            <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">
              Склад команди • {members.length} чол.
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isMe = item.user_id === userId;
          const roleDisplayName = ROLE_NAMES[item.role] || item.role;

          return (
            <View className="bg-zinc-800 p-5 rounded-[24px] mb-3 border border-zinc-700/50 flex-row items-center">
              <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${item.role === 'leader' ? 'bg-blue-600/10 border border-blue-500/30' : 'bg-zinc-900 border border-zinc-700'}`}>
                <Text className={`font-black text-xs ${item.role === 'leader' ? 'text-blue-500' : 'text-zinc-500'}`}>
                  {roleDisplayName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View className="flex-1">
                <Text className="text-white font-bold text-[14px]">{item.email}</Text>
                <View className="flex-row items-center mt-1">
                  <TouchableOpacity 
                    disabled={!isOwner || isMe}
                    onPress={() => {
                      setSelectedMember(item);
                      setIsRoleModalOpen(true);
                    }}
                    className={`px-2 py-0.5 rounded-md border flex-row items-center ${(!isOwner || isMe) ? 'bg-zinc-900 border-zinc-700' : 'bg-blue-500/10 border-blue-500/20'}`}
                  >
                    <Text className={`text-[9px] font-black uppercase tracking-widest ${(!isOwner || isMe) ? 'text-zinc-500' : 'text-blue-400'}`}>
                      {roleDisplayName} {(isOwner && !isMe) && ' ✎'}
                    </Text>
                  </TouchableOpacity>
                  {isMe && (
                    <Text className="text-zinc-600 text-[9px] font-black uppercase tracking-widest ml-2">(Ви)</Text>
                  )}
                </View>
              </View>

              {isMe && <View className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500" />}
            </View>
          );
        }}
      />

      {/* Модалка зміни ролі */}
      <Modal visible={isRoleModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center p-6">
          <View className="bg-[#0d0d0d] border border-zinc-800 rounded-[32px] w-full max-w-sm overflow-hidden">
            <View className="p-6 border-b border-zinc-800 items-center">
              <Text className="text-white font-black uppercase italic tracking-widest text-center">
                Змінити роль для{'\n'}
                <Text className="text-blue-500 lowercase font-bold italic">{selectedMember?.email}</Text>
              </Text>
            </View>
            
            {updatingRole ? (
              <View className="p-10"><ActivityIndicator color="#0090ff" /></View>
            ) : (
              ROLES_LIST.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  onPress={() => handleUpdateRole(role.id)}
                  className={`p-5 items-center border-b border-zinc-800/50 ${selectedMember?.role === role.id ? 'bg-blue-600' : ''}`}
                >
                  <Text className={`font-bold uppercase italic ${selectedMember?.role === role.id ? 'text-white' : 'text-zinc-400'}`}>
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity onPress={() => setIsRoleModalOpen(false)} className="p-5 items-center">
              <Text className="text-zinc-500 font-bold uppercase text-xs">Скасувати</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}