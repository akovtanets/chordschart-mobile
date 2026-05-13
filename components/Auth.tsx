import React, { useState } from 'react';
import { ActivityIndicator, Alert, AppState, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
// Імпортуємо компоненти для малювання SVG
import Svg, { Circle, Path } from 'react-native-svg';

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Помилка входу', error.message);
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center items-center bg-zinc-900">
      <View className="w-1/2">
        
        {/* ТОЧНА КОПІЯ ВЕБ-ЛОГОТИПУ */}
        <View className="mb-12 items-center">
          <View className="flex-row items-center justify-center">
            
            {/* Іконка */}
            <View className="w-10 h-10 items-center justify-center bg-[#0090ff] rounded-xl shadow-lg mr-2.5">
              <Svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                // Задаємо розмір SVG всередині квадрата
                style={{ width: 20, height: 20 }}
              >
                <Path d="M12 2L7 22h10L12 2z" />
                <Path d="M12 18l-2-9" />
                <Circle cx="10" cy="9" r="1" fill="white" />
              </Svg>
            </View>

            {/* Текст: CHORDS (білий, курсив) + CHART (синій, прямий) */}
            <Text className="text-[28px] font-black italic tracking-tighter text-white">
              CHORDS<Text className="text-[#0090ff] not-italic">CHART</Text>
            </Text>

          </View>
          
          <Text className="text-center text-zinc-400 mt-4 text-base">
            Увійдіть у свій акаунт
          </Text>
        </View>
        {/* КІНЕЦЬ ЛОГОТИПУ */}

        <View className="mb-4">
          <TextInput
            className="bg-zinc-800 text-white px-5 py-4 rounded-xl text-base border border-zinc-700 focus:border-[#0090ff]"
            onChangeText={(text) => setEmail(text)}
            value={email}
            placeholder="Ваш Email"
            placeholderTextColor="#71717a"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View className="mb-8">
          <TextInput
            className="bg-zinc-800 text-white px-5 py-4 rounded-xl text-base border border-zinc-700 focus:border-[#0090ff]"
            onChangeText={(text) => setPassword(text)}
            value={password}
            secureTextEntry={true}
            placeholder="Пароль"
            placeholderTextColor="#71717a"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity 
          className="bg-[#0090ff] py-4 rounded-xl items-center shadow-lg active:bg-[#007cdb]"
          disabled={loading} 
          onPress={() => signInWithEmail()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">Увійти</Text>
          )}
        </TouchableOpacity>

      </View>
    </View>
  );
}