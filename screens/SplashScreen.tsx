import React, { useEffect } from 'react';
import { Image, ImageBackground, StyleSheet, View } from 'react-native'; 
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, withDelay} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

type Props = { navigation: any };

const BG_IMAGE_OPACITY = 0.35;
const LOGO_FADE_MS = 500;
const LOGO_MOVE_MS = 1100;
const TAGLINE_DELAY_MS = 650;
const TAGLINE_FADE_MS = 600;
const NEXT_ROUTE_DELAY_MS = 2000;

export default function SplashScreen({ navigation }: Props) {
  const logoScale = useSharedValue(1.8);
  const logoY = useSharedValue(30);
  const logoOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineY = useSharedValue(10);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: LOGO_FADE_MS, easing: Easing.out(Easing.quad) });
    logoScale.value = withTiming(1, { duration: LOGO_MOVE_MS, easing: Easing.out(Easing.cubic) });
    logoY.value = withTiming(-8, { duration: LOGO_MOVE_MS, easing: Easing.out(Easing.cubic) });

    taglineOpacity.value = withDelay(
      TAGLINE_DELAY_MS,
      withTiming(1, { duration: TAGLINE_FADE_MS, easing: Easing.out(Easing.quad) })
    );
    taglineY.value = withDelay(
      TAGLINE_DELAY_MS,
      withTiming(0, { duration: TAGLINE_FADE_MS, easing: Easing.out(Easing.quad) })
    );

    const t = setTimeout(() => navigation.replace('Onboarding'), NEXT_ROUTE_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const logoWrapStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }, { scale: logoScale.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
        <ImageBackground
          source={require('../assets/backgroundHushly2.png')}
          resizeMode="cover"
          style={styles.bgFill}
          imageStyle={{ opacity: BG_IMAGE_OPACITY }}
        >
          <View style={styles.center} pointerEvents="none">
            <Animated.View style={[styles.logoWrap, logoWrapStyle]}>
              <Image source={require('../assets/HushlyLogo3.png')} style={styles.logo} />
            </Animated.View>

            <Animated.Text style={[styles.tagline, taglineStyle]}>
              Breathe in. Let go.
            </Animated.Text>
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

  center: { 
    flex: 1, 
    alignItems: 'center',
    justifyContent: 'center' 
    },
  logoWrap: { 
    alignItems: 'center',
    justifyContent: 'center' 
    },
  logo: {
    width: 220,
    height: 220,
    resizeMode: 'contain' 
    },
  tagline: { 
    marginTop: 18,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600' 
    },
});
