import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Text, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import SignInForm from '../components/SignInForm';
import SignUpForm from '../components/SignUpForm';

const BG = '#141D2A';
const W = Dimensions.get('window').width;
const HEADER_H = 72; 

type Mode = 'login' | 'signup';

export default function AuthScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const initialMode: Mode = route?.params?.mode === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<Mode>(initialMode);

  const x = useSharedValue(initialMode === 'login' ? 0 : -W);
  const leftStyle  = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value + W }] }));

  const switchTo = (m: Mode) => {
    setMode(m);
    x.value = withTiming(m === 'login' ? 0 : -W, { duration: 240 });
  };

  const goOnboarding = () => navigation.replace('Onboarding');


  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goOnboarding();
      return true;
    });
    return () => sub.remove();
  }, []);

 
  const backPeek = useSharedValue(-8);      
  const backPress = useSharedValue(0);      
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(10);
  const subOpacity = useSharedValue(0);
  const subY = useSharedValue(8);
  const underline = useSharedValue(0);      


  useEffect(() => {
    backPeek.value      = withTiming(0,   { duration: 420 });
    titleOpacity.value  = withDelay(80,  withTiming(1, { duration: 260 }));
    titleY.value        = withDelay(80,  withTiming(0, { duration: 260 }));
    subOpacity.value    = withDelay(160, withTiming(1, { duration: 260 }));
    subY.value          = withDelay(160, withTiming(0, { duration: 260 }));
    underline.value     = withDelay(260, withTiming(1, { duration: 380 }));
  }, []);


  useEffect(() => {
    titleOpacity.value = withTiming(0, { duration: 120 }, () => {
      titleOpacity.value = withTiming(1, { duration: 220 });
    });
    titleY.value = withTiming(6, { duration: 120 }, () => {
      titleY.value = withTiming(0, { duration: 220 });
    });

    subOpacity.value = withTiming(0.6, { duration: 120 }, () => {
      subOpacity.value = withTiming(1, { duration: 220 });
    });
  }, [mode]);

  const backWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: backPeek.value },
      { scale: interpolate(backPress.value, [0, 1], [1, 0.92]) },
      { rotateZ: `${interpolate(backPress.value, [0, 1], [0, -6])}deg` },
    ],
    shadowOpacity: interpolate(backPress.value, [0, 1], [0.18, 0.28]),
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const subStyle = useAnimatedStyle(() => ({
    opacity: subOpacity.value,
    transform: [{ translateY: subY.value }],
  }));
  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: underline.value }],
    opacity: underline.value,
  }));

  const title = mode === 'login' ? 'Sign in' : 'Sign up';
  const subtitle = mode === 'login' ? 'Welcome back' : 'Create your account';

  return (
    <View style={styles.screen}>
      <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Animated.View style={[styles.backWrap, backWrapStyle]}>
            <TouchableOpacity
              onPress={goOnboarding}
              onPressIn={() => { backPress.value = withSpring(1, { mass: 0.3, damping: 12 }); }}
              onPressOut={() => { backPress.value = withSpring(0, { mass: 0.3, damping: 12 }); }}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back to onboarding"
            >
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </TouchableOpacity>
          </Animated.View>
          <View style={styles.titleCol}>
            <Animated.Text style={[styles.headerTitle, titleStyle]} numberOfLines={1}>
              {title}
            </Animated.Text>

            <Animated.View style={subStyle}>
              <Text style={styles.headerSub}>{subtitle}</Text>
              <Animated.View style={[styles.underline, underlineStyle]} />
            </Animated.View>
          </View>
          <View style={{ width: 52 }} />
        </View>
      </View>
      <View style={{ flex: 1, paddingTop: insets.top + HEADER_H }}>
        <Animated.View style={[StyleSheet.absoluteFill, leftStyle]}>
          <SignInForm
            onSwitchToSignup={() => switchTo('signup')}
            onSignedIn={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
            navigation={navigation}
          />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, rightStyle]}>
          <SignUpForm
            onSwitchToLogin={() => switchTo('login')}
            onSignedUp={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
            navigation={navigation}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: BG 
  },
  headerWrap: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    backgroundColor: BG,
    zIndex: 10,
  },
  headerRow: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  backWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
  },
  backBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  headerSub: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '700',
  },
  underline: {
    marginTop: 6,
    width: 112,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#7A00FF',
    transform: [{ scaleX: 0 }],
    transformOrigin: 'left',
  },
});
