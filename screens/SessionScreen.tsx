import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useShakeToRelax } from '../hooks/useShakeToRelax';
import MoodSelector from '../components/MoodSelector';

export default function SessionScreen() {
  const [isRelaxing, setIsRelaxing] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [mood, setMood] = useState<string | null>(null);

  const startRelaxing = async () => {
    setIsRelaxing(true);
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/calm-music.mp3')
      );
      setSound(sound);
      await sound.playAsync();
      Alert.alert('Relaxation started', 'Enjoy your calm moment 🌿');
    } catch (error) {
      console.error('Audio error:', error);
    }
  };

  useShakeToRelax(() => {
    if (!isRelaxing) startRelaxing();
  });

  const stopRelaxing = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }

    const user = auth.currentUser;
    if (user && mood) {
      await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        mood: mood,
        timestamp: Timestamp.now(),
        duration: 2 
      });
    }

    setIsRelaxing(false);
    setMood(null);
    Alert.alert('Session logged', 'Your mood has been saved 💾');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Relaxation Mode</Text>
      <Text style={styles.info}>
        Shake your phone to begin a calming session. Ambient music will play and your mood will be recorded.
      </Text>

      {isRelaxing ? (
        <>
          <Button title="End Session" onPress={stopRelaxing} color="#F57F51" />
          <MoodSelector
            onSelect={(selectedMood) => {
              setMood(selectedMood);
              Alert.alert('Mood Selected', `You chose: ${selectedMood}`);
            }}
          />
        </>
      ) : (
        <Text style={styles.waiting}>Waiting for shake...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 20, 
    backgroundColor: '#fff' 
  },
  title: { 
    fontSize: 24,
    textAlign: 'center', 
    marginBottom: 16 
  },
  info: { 
    fontSize: 16, 
    textAlign: 'center', 
    marginBottom: 30 },
  waiting: { 
    textAlign: 'center', 
    fontSize: 18, 
    color: '#3CB87B' 
  },
});
