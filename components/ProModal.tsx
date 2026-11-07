import { useRouter } from 'expo-router';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function ProModal({ 
  visible, 
  onClose, 
  title = "Досягнуто ліміт Free тарифу", 
  description = "Перейдіть на PRO, щоб отримати безлімітне створення подій та офлайн-режим для сцени." 
}: ProModalProps) {
  const router = useRouter();

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>ЛІМІТ ВИЧЕРПАНО</Text>
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <TouchableOpacity 
            style={styles.proButton}
            onPress={() => {
              onClose();
              // Перенаправляємо на мобільний екран тарифів
              router.push('/pricing'); 
            }}
          >
            <Text style={styles.proButtonText}>ДІЗНАТИСЯ ПРО PRO (ЗНИЖКА 50%)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#0a0a0a',
    borderColor: '#1f2937',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    backgroundColor: '#111827',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: '#6b7280', fontSize: 16 },
  badge: {
    backgroundColor: 'rgba(30, 58, 138, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  badgeText: { color: '#60a5fa', fontSize: 10, fontWeight: 'bold' },
  title: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  description: { color: '#9ca3af', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  proButton: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  proButtonText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' }
});