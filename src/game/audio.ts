let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function unlockAudio(): void {
  const audio = context();
  if (!audio) return;
  void audio.resume();
}

function beep(freq: number, duration: number, when = 0, type: OscillatorType = "triangle", gain = 0.04): void {
  const audio = context();
  if (!audio) return;
  const osc = audio.createOscillator();
  const vol = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.value = 0;
  osc.connect(vol);
  vol.connect(audio.destination);
  const t = audio.currentTime + when;
  vol.gain.setValueAtTime(0, t);
  vol.gain.linearRampToValueAtTime(gain, t + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export function playDice(): void {
  beep(220, 0.07, 0, "square", 0.03);
  beep(330, 0.08, 0.05, "square", 0.025);
}

export function playCash(): void {
  beep(523, 0.08, 0, "triangle", 0.04);
  beep(784, 0.1, 0.07, "triangle", 0.035);
}

export function playBad(): void {
  beep(160, 0.14, 0, "sawtooth", 0.03);
}

export function playTick(): void {
  beep(480, 0.03, 0, "square", 0.018);
}
