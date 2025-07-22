// components/Header.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

interface Props {
  title: string;
}

export default function Header({ title }: Props) {
  return <Text style={styles.header}>{title}</Text>;
}

const styles = StyleSheet.create({
  header: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 20,
  },
});
