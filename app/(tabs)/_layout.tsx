import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0090ff',
        tabBarInactiveTintColor: '#71717a',
        tabBarStyle: {
          backgroundColor: '#18181b', // zinc-900
          borderTopWidth: 0,
          elevation: 0,
        },
        headerStyle: {
          backgroundColor: '#18181b',
        },
        headerTitleStyle: {
          color: 'white',
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Сетлисти',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="songs"
        options={{
          title: 'Пісні',
          tabBarIcon: ({ color }) => <Ionicons name="musical-notes" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профіль',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}