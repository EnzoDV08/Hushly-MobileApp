import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { auth } from '../firebase/firebaseConfig';
import { theme } from '../styles/theme';

export default function ProfileScreen({ navigation }: any) {
  const user = auth.currentUser;

  const handleLogout = () => {
    auth.signOut();
    navigation.replace('Auth');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Profile</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.text}>{user?.email}</Text>

        <Text style={styles.label}>UID:</Text>
        <Text style={styles.text}>{user?.uid}</Text>
      </View>

      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.large,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.fontSize.large,
    color: theme.colors.primary,
    marginBottom: theme.spacing.large,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.grey,
    padding: theme.spacing.medium,
    borderRadius: 10,
    marginBottom: theme.spacing.large,
  },
  label: {
    fontSize: theme.fontSize.medium,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.small / 2,
  },
  text: {
    fontSize: theme.fontSize.medium,
    marginBottom: theme.spacing.small,
    color: theme.colors.primary,
  },
  logoutButton: {
    backgroundColor: theme.colors.orange,
    padding: theme.spacing.medium,
    borderRadius: 8,
  },
  logoutText: {
    textAlign: 'center',
    color: theme.colors.background,
    fontSize: theme.fontSize.medium,
    fontWeight: '600',
  },
});
