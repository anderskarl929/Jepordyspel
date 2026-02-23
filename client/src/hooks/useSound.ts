import { useCallback, useRef } from 'react';

type SoundType = 'correct' | 'incorrect' | 'buzz' | 'tick' | 'reveal';

interface NoteConfig {
  freq: number;
  duration: number;
  type: OscillatorType;
  delay: number;
}

const SOUNDS: Record<SoundType, NoteConfig[]> = {
  // C5-E5-G5 ascending arpeggio (triumphant)
  correct: [
    { freq: 523, duration: 120, type: 'sine', delay: 0 },
    { freq: 659, duration: 120, type: 'sine', delay: 120 },
    { freq: 784, duration: 200, type: 'sine', delay: 240 },
  ],
  // Eb4-Db4 descending (disappointment)
  incorrect: [
    { freq: 311, duration: 200, type: 'triangle', delay: 0 },
    { freq: 277, duration: 300, type: 'triangle', delay: 200 },
  ],
  // A4-C#5 quick ascending (alert)
  buzz: [
    { freq: 440, duration: 80, type: 'sine', delay: 0 },
    { freq: 554, duration: 120, type: 'sine', delay: 80 },
  ],
  // G4-B4-D5 ascending (dramatic)
  reveal: [
    { freq: 392, duration: 150, type: 'sine', delay: 0 },
    { freq: 494, duration: 150, type: 'sine', delay: 150 },
    { freq: 587, duration: 250, type: 'sine', delay: 300 },
  ],
  // Short tick
  tick: [
    { freq: 800, duration: 40, type: 'sine', delay: 0 },
  ],
};

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback((sound: SoundType) => {
    try {
      if (!ctxRef.current) {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      const notes = SOUNDS[sound];
      const gain = sound === 'tick' ? 0.08 : 0.12;

      for (const note of notes) {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = note.type;
        osc.frequency.value = note.freq;

        const startTime = ctx.currentTime + note.delay / 1000;
        const endTime = startTime + note.duration / 1000;

        gainNode.gain.setValueAtTime(gain, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(endTime);
      }
    } catch {
      // Audio not supported or blocked
    }
  }, []);

  return play;
}
