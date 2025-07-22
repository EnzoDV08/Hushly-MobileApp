import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import MainScreen from '../screens/MainScreen';
import SessionScreen from '../screens/SessionScreen';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen name="Sessions" component={SessionScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

