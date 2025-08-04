import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';

export default function SensorFeedback() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3CB87B" />
      <Text style={styles.text}>Detecting shake...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    alignItems: 'center', 
    marginVertical: 20 },
  text: { 
    marginTop: 10, 
    fontSize: 16 }
});
