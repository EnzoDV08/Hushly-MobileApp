import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const moods = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😔', label: 'Tired' },
  { emoji: '😤', label: 'Stressed' },
];

interface Props {
  onSelect: (mood: string) => void;
}

export default function MoodSelector({ onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How do you feel?</Text>
      <View style={styles.moodRow}>
        {moods.map((m) => (
          <TouchableOpacity key={m.label} style={styles.mood} onPress={() => onSelect(m.label)}>
            <Text style={styles.emoji}>{m.emoji}</Text>
            <Text style={styles.label}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginTop: 30 
  },
  title: { 
    fontSize: 18, 
    textAlign: 'center', 
    marginBottom: 12 
  },
  moodRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around' 
  },
  mood: { 
    alignItems: 'center' 
  },
  emoji: { 
    fontSize: 32 
  },
  label: { 
    fontSize: 14, 
    marginTop: 4 
  }
});
