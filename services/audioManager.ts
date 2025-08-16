import { Audio, AVPlaybackStatus } from 'expo-av';

export type AudioSource = { uri: string | number; id?: string };

type PlayingListener = (playing: boolean) => void;

class AudioManager {
  private sound: Audio.Sound | null = null;
  private playing = false;
  private volume = 0.55;
  private source: AudioSource | null = null;
  private positionMs = 0;
  private durationMs = 0;
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
      // expose progress with both names so your MiniPlayer's readProgress() works
      position: this.positionMs,
      positionMs: this.positionMs,
      duration: this.durationMs,
      durationMs: this.durationMs,
    };
  }

  async setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.sound) {
      try { await this.sound.setVolumeAsync(this.volume); } catch {}
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
    try { await this.sound.pauseAsync(); } catch {}
    this.playing = false;
    this.notify();
  }

  async stop() {
    if (!this.sound) return;
    try { await this.sound.stopAsync(); } catch {}
    try { await this.sound.unloadAsync(); } catch {}
    this.playing = false;
    this.positionMs = 0;
    this.durationMs = 0;
    this.source = null;
    this.notify();
  }

  private notify() {
    for (const l of this.listeners) l(this.playing);
  }

  private async ensureSound() {
    if (!this.sound) {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,

      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,

      staysActiveInBackground: false,
    });

      this.sound = new Audio.Sound();
      try { await this.sound.setProgressUpdateIntervalAsync(250); } catch {}

      this.sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;

        // capture progress
        // @ts-ignore: expo-av types
        const pos = (status as any).positionMillis ?? 0;
        // @ts-ignore: expo-av types
        const dur =
          (status as any).durationMillis ??
          // some streams expose playableDurationMillis
          (status as any).playableDurationMillis ??
          0;

        this.positionMs = typeof pos === 'number' ? pos : 0;
        this.durationMs = typeof dur === 'number' ? dur : 0;

        const next = status.isPlaying === true;
        if (next !== this.playing) {
          this.playing = next;
          this.notify();
        }
      });
    }
    return this.sound;
  }

  /** Build a source that hints Android's ExoPlayer to treat remote files as MP3.
   *  We skip the override for HLS (.m3u8) streams.
   */
  private buildSource(uri: string | number) {
    if (typeof uri !== 'string') return uri;
    const clean = uri.split('?')[0].toLowerCase();
    const isHls = clean.endsWith('.m3u8');
    if (isHls) {
      return { uri };
    }
    return { uri, overrideFileExtensionAndroid: 'mp3' as const };
  }

private async loadAndStart(snd: Audio.Sound, uri: string | number, loop: boolean, volume: number) {
  try { await snd.stopAsync(); } catch {}
  try { await snd.unloadAsync(); } catch {}

  const source = this.buildSource(uri);
  await snd.loadAsync(source as any, undefined, true); // downloadFirst=true

  // get initial duration if available
  try {
    const st = await snd.getStatusAsync();
    // @ts-ignore
    this.durationMs = (st as any).durationMillis ?? this.durationMs;
    this.positionMs = 0;
  } catch {}

  try { await snd.setIsMutedAsync(false); } catch {}
  try { await snd.setIsLoopingAsync(loop); } catch {}
  try { await snd.setVolumeAsync(Math.max(0.05, volume)); } catch {}

  await snd.playAsync();
  this.playing = true;
  this.notify();
  }
}

export const audioManager = new AudioManager();

