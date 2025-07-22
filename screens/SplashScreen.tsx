import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

export default function SplashScreen({ navigation }: any) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <Image source={require('../assets/HushlyLogo1.png')} style={styles.logo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  logo: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
  },
});
