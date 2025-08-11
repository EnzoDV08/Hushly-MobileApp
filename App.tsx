import 'react-native-reanimated'; 
import React, { useEffect, useState } from 'react';
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
import SettingsScreen from './screens/SettingsScreen'
import SessionScreen from './screens/SessionScreen';
import SessionHistoryScreen from './screens/SessionHistoryScreen';
// import { getStoredUser } from './services/authPersistence';
// import { DocumentData } from 'firebase/firestore';

const Stack = createNativeStackNavigator();


export default function App() {
// const [loading, setLoading] = useState(true);
// const [user, setUser] = useState<DocumentData | null>(null);

// useEffect(() => {
//   const checkLogin = async () => {
//     const restoredUser = await getStoredUser();
//     console.log("Restored user:", restoredUser);
//     setUser(restoredUser);
//     setLoading(false);
//   };
//   checkLogin();
// }, []);

useEffect(() => {
  if (Platform.OS === 'android') {
    (async () => {
      await NavigationBar.setButtonStyleAsync('light');     
      })();
    }
  }, []);

  return (
    <>
      <StatusBar style="light" translucent />

<NavigationContainer>
  <Stack.Navigator
    initialRouteName="Splash"
    screenOptions={{
      headerShown: false,                   
      headerStyle: { backgroundColor: '#141D2A' },
      headerTintColor: 'white',
      headerShadowVisible: false,
      headerTitleAlign: 'center',
    }}
  >
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
