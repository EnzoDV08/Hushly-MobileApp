import { Audio, AVPlaybackStatusSuccess } from 'expo-av';

type Listener = (playing: boolean) => void;

class AudioManager {
  private sound: Audio.Sound | null = null;
  private isLoaded = false;
  private isPlaying = false;
  private listeners: Listener[] = [];

  addListener(l: Listener) { this.listeners.push(l); return () => {
    this.listeners = this.listeners.filter(x => x !== l);
  }; }
  private notify() { this.listeners.forEach(l => l(this.isPlaying)); }

  async loadAsync(uri: string) {
    if (this.sound) return;
    await Audio.setAudioModeAsync({ staysActiveInBackground: false, playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false, isLooping: true },
      (st) => {
        const s = st as AVPlaybackStatusSuccess;
        if (!s.isLoaded) return;
        const nowPlaying = s.isPlaying ?? false;
        if (nowPlaying !== this.isPlaying) {
          this.isPlaying = nowPlaying;
          this.notify();
        }
      }
    );
    this.sound = sound;
    this.isLoaded = true;
  }

  async play(uri?: string) {
    if (!this.sound && uri) await this.loadAsync(uri);
    if (!this.sound) return;
    await this.sound.playAsync();
  }

  async pause() {
    if (!this.sound) return;
    await this.sound.pauseAsync();
  }

  async stop() {
    if (!this.sound) return;
    try { await this.sound.stopAsync(); } catch {}
    try { await this.sound.unloadAsync(); } catch {}
    this.sound = null;
    this.isLoaded = false;
    this.isPlaying = false;
    this.notify();
  }

  getPlaying() { return this.isPlaying; }
}

export const audioManager = new AudioManager();
