import React, { useEffect, useRef, useState, memo } from 'react';
import { Dimensions, Image, ImageBackground, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSequence, withTiming, withRepeat, SharedValue, Extrapolate, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';

// import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';


const { width } = Dimensions.get('window');

const TOP_OFFSET = 66;
const HERO_HEIGHT = 360;
const CARD_WIDTH = Math.min(width * 0.96, 500);
const TITLE_SIZE = 30;
const AUTO_ADVANCE_MS = 4200;
const GLOW_SIZE = 300;
const BG_IMAGE_OPACITY = 0.35;

type Slide = { key: string; title: string; description: string; image: any };

const slides: Slide[] = [
  { key: '1', title: 'Welcome to Hushly', description: 'Relax. Recenter. Recharge.', image: require('../assets/HushlyLogo2.png') },
  { key: '2', title: 'Find Your Calm', description: 'Ambient sounds and breathing exercises.', image: require('../assets/illustration2.png') },
  { key: '3', title: 'Stay Balanced', description: 'Track your mood.', image: require('../assets/illustration1.png') },
];

// GoogleSignin.configure({
//   webClientId: '433413816515-klmo9hb11sk602dqf8fcm2sq0fvh65as.apps.googleusercontent.com',
// });

const SlideItem = memo(function SlideItem({
  item, index, scrollX,
}: { item: Slide; index: number; scrollX: SharedValue<number> }) {
  const heroStyle = useAnimatedStyle(() => {
    const center = index * width;
    const d = (scrollX.value - center) / width;
    const scale = interpolate(d, [-1, 0, 1], [0.95, 1, 0.95]);
    const translateY = interpolate(d, [-1, 0, 1], [20, 0, 20]);
    return { transform: [{ scale }, { translateY }] };
  });

  const imageStyle = useAnimatedStyle(() => {
    const center = index * width;
    const d = (scrollX.value - center) / width;
    const translateX = interpolate(d, [-1, 0, 1], [36, 0, -36]);
    const opacity = interpolate(d, [-1, 0, 1], [0.7, 1, 0.7]);
    const scale = interpolate(d, [-1, 0, 1], [0.98, 1, 0.98]);
    return { opacity, transform: [{ translateX }, { scale }] };
  });

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.heroArea, heroStyle]}>
        <Animated.Image
          source={item.image}
          style={[styles.illustration, item.key === '1' && styles.large, imageStyle]}
        />
      </Animated.View>
    </View>
  );
});

export default function OnboardingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<Animated.FlatList<Slide>>(null);

  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [incomingTextIndex, setIncomingTextIndex] = useState<number | null>(null);

  const curOpacity = useSharedValue(1);
  const curY       = useSharedValue(0);

  const incOpacity = useSharedValue(0);
  const incY       = useSharedValue(10);


  const curStyle = useAnimatedStyle(() => ({
    opacity: curOpacity.value,
    transform: [{ translateY: curY.value }, { scale: 0.98 + curOpacity.value * 0.02 }],
}));

  const incStyle = useAnimatedStyle(() => ({
    opacity: incOpacity.value,
    transform: [{ translateY: incY.value }, { scale: 0.98 + incOpacity.value * 0.02 }],
}));

  const glow = useSharedValue(1);
  
useEffect(() => {
  const MIN = 0.92;    
  const MAX = 1.08;    
  const CYCLE = 3600;  

  glow.value = MIN;
  
  glow.value = withRepeat(
    withTiming(MAX, {
      duration: CYCLE / 2,
      easing: Easing.inOut(Easing.sin), 
    }),
    -1,  
    true  
  );

  return () => { glow.value = 1; };
}, []);

useEffect(() => {
  const id = setInterval(() => {
    const next = (index + 1) % slides.length;
    listRef.current?.scrollToOffset({
      offset: next * width,
      animated: true,
    });
  }, AUTO_ADVANCE_MS);
  return () => clearInterval(id);
}, [index]);

  const glowStyle = useAnimatedStyle(() => ({ transform: [{ scale: glow.value }] }));
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({ onScroll: (e) => { scrollX.value = e.contentOffset.x; } });

const commitSwap = (i: number) => {
  setCurrentTextIndex(i);
  setIncomingTextIndex(null);

  requestAnimationFrame(() => {
    curOpacity.value = 1;
    curY.value = 0;
    incOpacity.value = 0;
    incY.value = 10;
  });
};

const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
  const i = Math.round(e.nativeEvent.contentOffset.x / width);
  if (i === index) return;
  setIndex(i);
  setIncomingTextIndex(i);

  incOpacity.value = 0;
  incY.value = 10;

  curOpacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
  curY.value       = withTiming(-6, { duration: 200, easing: Easing.out(Easing.cubic) });

 incOpacity.value = withTiming(
  1,
  { duration: 260, easing: Easing.out(Easing.cubic) },
  (finished) => {
    if (!finished) return;
    runOnJS(commitSwap)(i);
  }
);
  incY.value       = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
};

  const active = slides[index];
  const glowTop = insets.top + TOP_OFFSET + (HERO_HEIGHT - GLOW_SIZE) / 2;


// const handleGoogleSignIn = async () => {
//   try {
//     await GoogleSignin.hasPlayServices();
//     const result = await GoogleSignin.signIn();
//     const idToken = (result as any).idToken;   
//     if (!idToken) throw new Error('No ID token from Google Sign-in');

//     const googleCredential = auth.GoogleAuthProvider.credential(idToken);
//     const userCredential = await auth().signInWithCredential(googleCredential);
//     const user = userCredential.user;

//     if (!user) {
//       console.warn('Google sign-in succeeded but no user was returned.');
//       return;
//     }

    // Write/update user doc in Firestore
//     const userRef = firestore().collection('users').doc(user.uid);
//     const userSnap = await userRef.get();
//     const userData = {
//       uid: user.uid,
//       email: user.email ?? null,
//       displayName: user.displayName ?? null,
//       photoURL: user.photoURL ?? null,
//       provider: user.providerData?.[0]?.providerId ?? 'google.com',
//       updatedAt: firestore.FieldValue.serverTimestamp(),
//     };
//     if (!userSnap.exists) {
//       await userRef.set({
//         ...userData,
//         createdAt: firestore.FieldValue.serverTimestamp(),
//         role: 'user',
//         points: 0,
//       });
//     } else {
//       await userRef.set(userData, { merge: true });
//     }
//     navigation.reset({ index: 0, routes: [{ name: 'Main' }] });

//   } catch (e) {
//     console.error('Google Sign-in Error:', e);
//     // Add any extra error handling here
//   }
// };

  return (
<View style={styles.container}>
  <StatusBar style="light" translucent />
      <ImageBackground
        source={require('../assets/backgroundHushly3.png')}
        resizeMode="cover"
        style={styles.bgFill}
        imageStyle={[styles.bgImage, { transform: [{ translateX: -24 }, { translateY: 16 }, { scale: 1.13 }] }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            { position: 'absolute', top: glowTop, left: (width - GLOW_SIZE) / 2, width: GLOW_SIZE, height: GLOW_SIZE, zIndex: 0 },
            glowStyle,
          ]}
        />

        <Animated.FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(it) => it.key}
          horizontal
          pagingEnabled
          bounces={false}
          decelerationRate="normal"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + TOP_OFFSET }}
          removeClippedSubviews={false}
          onScrollBeginDrag={() => {}}
          onMomentumScrollEnd={onMomentumEnd}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item, index: i }) => <SlideItem item={item} index={i} scrollX={scrollX} />}
        />

<View style={styles.card}>
<View style={styles.dotsInCard}>
  {slides.map((_, i) => {
    const dotStyle = useAnimatedStyle(() => {
      const d = Math.abs(scrollX.value / width - i);
      const widthAnim = interpolate(d, [0, 1], [20, 8], Extrapolate.CLAMP);
      const opacity = interpolate(d, [0, 1], [1, 0.6], Extrapolate.CLAMP);

      return { width: widthAnim, opacity };
    });

    const isActive = i === index; 
    return (
      <Animated.View
        key={i}
        style={[
          styles.dot,
          { backgroundColor: isActive ? '#7A00FF' : '#D1D5DB' },
          dotStyle,
        ]}
      />
    );
  })}
</View>

<View style={styles.textBlock} collapsable={false}>
  <Animated.View style={[curStyle]} pointerEvents="none">
    <Text style={styles.title}>{slides[currentTextIndex].title}</Text>
    <Text style={styles.desc}>{slides[currentTextIndex].description}</Text>
  </Animated.View>

  <Animated.View style={[StyleSheet.absoluteFill, incStyle]} pointerEvents="none">
    <Text style={styles.title}>{slides[incomingTextIndex ?? currentTextIndex].title}</Text>
    <Text style={styles.desc}>{slides[incomingTextIndex ?? currentTextIndex].description}</Text>
  </Animated.View>
</View>

<TouchableOpacity style={styles.googleBtn}>
  <Image source={require('../assets/google.png')} style={styles.googleLogo} />
  <Text style={styles.googleText}>Continue with Google</Text>
</TouchableOpacity>


<TouchableOpacity
  style={styles.primaryBtn}
  onPress={() => navigation.navigate('Auth', { mode: 'signup' })}
>
  <Text style={styles.primaryText}>Sign up with email</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => navigation.navigate('Auth', { mode: 'login' })}>
  <Text style={styles.signInText}>I already have an account — Sign in</Text>
</TouchableOpacity>

        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#141D2A', 
    position: 'relative' 
  },
  bgFill: { 
    flex: 1, 
    position: 'relative' 
  },
  slide: { 
    width, 
    alignItems: 'center' 
  },
  heroArea: { width, 
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1 },
  glow: { 
    borderRadius: GLOW_SIZE / 2, 
    backgroundColor: 'rgba(122,0,255,0.28)' 
  },
  illustration: { width: 270,
     height: 270, 
     resizeMode: 'contain' 
  },
  large: { 
    width: 230, 
    height: 230 
  },
  dotsInCard: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginBottom: 14, 
    gap: 8 
  },
  dot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#D1D5DB' 
  },
  dotActive: {
    width: 20,
    borderRadius: 10, 
    backgroundColor: '#7A00FF' 
  },
  card: {
    position: 'absolute', 
    bottom: 18, 
    width: CARD_WIDTH, 
    alignSelf: 'center', 
    backgroundColor: 'white',
    borderRadius: 28, 
    paddingHorizontal: 28, 
    paddingTop: 26, 
    paddingBottom: 34,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.18, 
    shadowRadius: 18, 
    elevation: 10,
  },
  title: { 
    color: '#0F172A', 
    fontSize: TITLE_SIZE, 
    fontWeight: '900', 
    marginBottom: 10 
  },
  desc: { 
    color: '#667085', 
    fontSize: 16, 
    lineHeight: 23, 
    marginBottom: 20 
  },
googleBtn: {
  flexDirection: 'row',
  justifyContent: 'center', 
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 16,
  paddingVertical: 16,
  paddingHorizontal: 16,
  marginBottom: 12,
  backgroundColor: 'white',
  gap: 10, 
},
googleLogo: {
  width: 26, 
  height: 26,
  resizeMode: 'contain',
},
googleText: {
  color: '#111827',
  fontWeight: '700',
  fontSize: 15,
},
  primaryBtn: { backgroundColor: '#7A00FF', 
    borderRadius: 16, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginBottom: 12 
  },
  primaryText: { 
    color: 'white', 
    fontWeight: '800', 
    fontSize: 16 
  },
  signInText: { 
    color: '#7A00FF', 
    fontWeight: '700', 
    textAlign: 'center', 
    marginTop: 2 
  },
  bgImage: { 
    opacity: BG_IMAGE_OPACITY 
  },
  textBlock: {
  minHeight: 88, 
  justifyContent: 'flex-start',
  position: 'relative',
},
});
