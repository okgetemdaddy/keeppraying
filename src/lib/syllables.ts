/** Syllable counter — English heuristic (~95% accurate). Shared client-side. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 2) return w.length > 0 ? 1 : 0;

  const exceptions: Record<string, number> = {
    prayer: 1, prayed: 1, blessed: 2, loved: 1, moved: 1,
    every: 3, heaven: 2, heavenly: 3, spirit: 2, being: 2,
    fire: 1, desire: 2, inspire: 3, entire: 3,
  };
  if (exceptions[w] !== undefined) return exceptions[w];

  let count = 0;
  const vowels = "aeiouy";
  let prevVowel = false;

  for (let i = 0; i < w.length; i++) {
    const isVowel = vowels.includes(w[i]);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }

  if (w.endsWith("e") && !w.endsWith("le") && !w.endsWith("ce") && !w.endsWith("ge") && count > 1) {
    count--;
  }
  if (w.endsWith("ed") && w.length > 3) {
    const beforeEd = w[w.length - 3];
    if (beforeEd !== "t" && beforeEd !== "d") {
      count = Math.max(1, count - 1);
    }
  }

  return Math.max(1, count);
}

export function countTextSyllables(text: string): number {
  return text.split(/\s+/).filter(Boolean).reduce((sum, w) => sum + countSyllables(w), 0);
}

/* ── TTS pacing calibration via localStorage ── */
const CALIBRATION_KEY = "kp-tts-calibration";
const MAX_SAMPLES = 50;

interface CalibrationSample {
  syllables: number;
  duration: number;
}

export function getCalibrationRate(): number | null {
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY);
    if (!raw) return null;
    const samples: CalibrationSample[] = JSON.parse(raw);
    if (!Array.isArray(samples) || samples.length < 3) return null;
    const totalSyl = samples.reduce((s, x) => s + x.syllables, 0);
    const totalDur = samples.reduce((s, x) => s + x.duration, 0);
    return totalDur / totalSyl; // seconds per syllable
  } catch {
    return null;
  }
}

export function recordCalibration(syllableCount: number, actualDuration: number): void {
  if (syllableCount < 5 || actualDuration < 2) return;
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY);
    const samples: CalibrationSample[] = raw ? JSON.parse(raw) : [];
    samples.push({ syllables: syllableCount, duration: actualDuration });
    // Keep only the last MAX_SAMPLES
    while (samples.length > MAX_SAMPLES) samples.shift();
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(samples));
  } catch { /* noop */ }
}
