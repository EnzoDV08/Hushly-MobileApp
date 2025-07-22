import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

export default function MainScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Hushly</Text>
      <Text style={styles.subtitle}>Choose what you’d like to do:</Text>

      <Button title="Start Session" onPress={() => navigation.navigate('Session')} />
      <Button title="Track Mood" onPress={() => navigation.navigate('Mood')} />
      <Button title="Settings" onPress={() => navigation.navigate('Settings')} />
      <Button title="Profile" onPress={() => navigation.navigate('Profile')} />
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
    textAlign: 'center',
    color: theme.colors.primary,
    marginBottom: theme.spacing.medium,
  },
  subtitle: {
    fontSize: theme.fontSize.medium,
    textAlign: 'center',
    marginBottom: theme.spacing.large,
  },
});
