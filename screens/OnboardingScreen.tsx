import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../styles/theme';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: '1',
    title: 'Shake to Relax',
    desc: 'Gently shake your phone to start a calming experience.',
    image: require('../assets/HushlyLogo1.png'),
  },
  {
    key: '2',
    title: 'Relax with Sound',
    desc: 'Enjoy ambient sounds like rain, ocean or forest during the session.',
    image: require('../assets/HushlyLogo2.png'),
  },
  {
    key: '3',
    title: 'Track Your Calm',
    desc: 'See your streaks, mood logs and progress over time.',
    image: require('../assets/HushlyLogo1.png'),
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const flatListRef = useRef<FlatList>(null);
  const currentIndex = useRef(0);

  const goToNext = () => {
    if (currentIndex.current < slides.length - 1) {
      currentIndex.current += 1;
      flatListRef.current?.scrollToIndex({ index: currentIndex.current });
    } else {
      navigation.replace('Auth');
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.slide}>
      <Image source={item.image} style={styles.image} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.desc}>{item.desc}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
      />
      <TouchableOpacity onPress={goToNext} style={styles.button}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.replace('Auth')}>
        <Text style={styles.skip}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.large,
  },
  image: { width: 200, height: 200, marginBottom: 20, resizeMode: 'contain' },
  title: {
    fontSize: theme.fontSize.large,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.primary,
  },
  desc: {
    fontSize: theme.fontSize.medium,
    textAlign: 'center',
    paddingHorizontal: 20,
    color: theme.colors.text,
  },
  button: {
    backgroundColor: theme.colors.accent,
    padding: 12,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.medium,
  },
  skip: {
    textAlign: 'center',
    marginTop: 10,
    color: theme.colors.text,
  },
});

