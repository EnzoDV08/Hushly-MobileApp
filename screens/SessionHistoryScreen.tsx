import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { theme } from '../styles/theme';

interface Session {
  id: string;
  mood: string;
  duration: number;
  timestamp: any;
}

export default function SessionHistoryScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(collection(db, 'sessions'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const userSessions: Session[] = [];
      querySnapshot.forEach((doc) => {
        userSessions.push({ id: doc.id, ...doc.data() } as Session);
      });

      setSessions(userSessions);
    };

    fetchSessions();
  }, []);

  const renderItem = ({ item }: { item: Session }) => (
    <View style={styles.card}>
      <Text style={styles.mood}>Mood: {item.mood}</Text>
      <Text style={styles.details}>Duration: {item.duration} mins</Text>
      <Text style={styles.details}>
        Date: {item.timestamp.toDate().toLocaleString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session History</Text>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20 
  },
  title: { 
    fontSize: theme.fontSize.large,
    textAlign: 'center',
    marginBottom: 20,
    color: theme.colors.primary 
  },
  card: { 
    backgroundColor: '#f2f2f2', 
    padding: 15, 
    borderRadius: 10,
    marginBottom: 15 },
  mood: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 5 
  },
  details: { 
    fontSize: 14 
  },
});
