import 'react-native-reanimated'; 
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import SplashScreen from './screens/SplashScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import MainScreen from './screens/MainScreen';
import SoundsScreen from './screens/SoundsScreen';
import AuthScreen from './screens/AuthScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import SessionScreen from './screens/SessionScreen';
import SessionHistoryScreen from './screens/SessionHistoryScreen';
import { navigationRef } from './navigationRef';  
import GlobalShakeWatcher from './hooks/GlobalShakeWatcher';

const Stack = createNativeStackNavigator();


export default function App() {

useEffect(() => {
  if (Platform.OS === 'android') {
    (async () => {
      try {
        await NavigationBar.setButtonStyleAsync('light');
      } catch (e) {
        console.warn('NavigationBar style failed:', e);
      }
      })();
    }
  }, []);

  return (
    <>
    <StatusBar style="light" translucent />
<NavigationContainer ref={navigationRef}>
   <GlobalShakeWatcher />
  <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Main" component={MainScreen} />
    <Stack.Screen name="Sounds" component={SoundsScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Session" component={SessionScreen} />
    <Stack.Screen name="SessionHistory" component={SessionHistoryScreen} />
  </Stack.Navigator>
</NavigationContainer>
    </>
  );
}
