import { Audio, AVPlaybackStatus } from 'expo-av';

export type AudioSource = { uri: string | number; id?: string };

type PlayingListener = (playing: boolean) => void;

class AudioManager {
  private sound: Audio.Sound | null = null;
  private playing = false;
  private volume = 0.55;
  private source: AudioSource | null = null;
  private listeners = new Set<PlayingListener>();

  addListener(listener: PlayingListener): () => void {
    this.listeners.add(listener);
    listener(this.playing);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState() {
    return {
      playing: this.playing,
      volume: this.volume,
      source: this.source, 
    };
  }

  async setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.sound) {
      try {
        await this.sound.setVolumeAsync(this.volume);
      } catch {}
    }
  }

  async play(uri: string | number, volume = this.volume, id?: string) {
    this.source = { uri, id };
    this.volume = volume;
    const s = await this.ensureSound();
    await this.loadAndStart(s, uri, false, volume);
  }

  async playLoop(uri: string | number, volume = this.volume, id?: string) {
    this.source = { uri, id };
    this.volume = volume;
    const s = await this.ensureSound();
    await this.loadAndStart(s, uri, true, volume);
  }

  async resume() {
    if (!this.sound) return;
    try {
      await this.sound.playAsync();
      this.playing = true;
      this.notify();
    } catch {}
  }

  async pause() {
    if (!this.sound) return;
    try {
      await this.sound.pauseAsync();
    } catch {}
    this.playing = false;
    this.notify();
  }

  async stop() {
    if (!this.sound) return;
    try { await this.sound.stopAsync(); } catch {}
    try { await this.sound.unloadAsync(); } catch {}
    this.playing = false;
    this.notify();
  }

  private notify() {
    for (const l of this.listeners) l(this.playing);
  }

  private async ensureSound() {
    if (!this.sound) {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      this.sound = new Audio.Sound();
      this.sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        const next = status.isPlaying === true;
        if (next !== this.playing) {
          this.playing = next;
          this.notify();
        }
      });
    }
    return this.sound;
  }

  private async loadAndStart(snd: Audio.Sound, uri: string | number, loop: boolean, volume: number) {
    try { await snd.stopAsync(); } catch {}
    try { await snd.unloadAsync(); } catch {}
    await snd.loadAsync(typeof uri === 'string' ? { uri } : uri);
    await snd.setIsLoopingAsync(loop);
    await snd.setVolumeAsync(volume);
    await snd.playAsync();
    this.playing = true;
    this.notify();
  }
}

export const audioManager = new AudioManager();
