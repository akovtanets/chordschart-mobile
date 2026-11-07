import { supabase } from '@/lib/supabase'; // Переконайся, що шлях до supabase клієнта правильний
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function PricingScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!email.includes('@')) {
      setErrorMsg('Будь ласка, введіть коректний email');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Отримуємо поточного юзера, щоб прив'язати лід до його ID
      const { data: { session } } = await supabase.auth.getSession();
      
      // Зберігаємо email напряму в базу Supabase (таблиця pro_leads)
      const { error } = await supabase
        .from('pro_leads')
        .insert([
          { 
            email: email.trim(),
            user_id: session?.user?.id || null 
          }
        ]);

      if (error) throw error;

      // Якщо успішно — показуємо екран подяки
      setSubmitted(true);
    } catch (error: any) {
      console.error('Помилка збереження ліда:', error);
      setErrorMsg(error.message || 'Сталася помилка. Спробуйте ще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Назад</Text>
      </TouchableOpacity>

      {submitted ? (
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Супер!</Text>
          <Text style={styles.successText}>
            Ми зберегли твій email. Як тільки PRO-версія буде готова, ти отримаєш лист із персональною знижкою 50%!
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>ПОВЕРНУТИСЯ ДО ДОДАТКУ</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>РАННІЙ ДОСТУП</Text>
          </View>
          
          <Text style={styles.title}>Chordschart PRO</Text>
          
          <Text style={styles.description}>
            PRO-версія зараз знаходиться в розробці. Залиш свій email, щоб отримати безлімітні сет-листи, офлайн-режим для сцени та знижку 50% на момент запуску!
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ваш email..."
            placeholderTextColor="#6b7280"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>ОТРИМАТИ ЗНИЖКУ 50%</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 24,
  },
  backButton: {
    marginTop: 40,
    marginBottom: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  successText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  badge: {
    backgroundColor: 'rgba(30, 58, 138, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    color: '#9ca3af',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderWidth: 1,
    borderRadius: 16,
    color: '#fff',
    width: '100%',
    padding: 18,
    fontSize: 16,
    marginBottom: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  button: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#1d4ed8',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});