/**
 * Minimal typings for the Web Speech API. It is not in TypeScript's DOM lib,
 * and Chrome still exposes it under the webkit prefix.
 */
export interface SpeechAlternative { transcript: string; confidence: number }
export interface SpeechResult { length: number; isFinal: boolean; [i: number]: SpeechAlternative }
export interface SpeechResultList { length: number; [i: number]: SpeechResult }
export interface SpeechEvent { results: SpeechResultList; resultIndex: number }
export interface SpeechErrorEvent { error: string; message?: string }

export interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type Ctor = new () => Recognition;

export function recognitionCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Every alternative of the final result, best first. */
export function alternativesOf(e: SpeechEvent): string[] {
  const out: string[] = [];
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const r = e.results[i];
    if (!r?.isFinal) continue;
    for (let a = 0; a < r.length; a++) {
      const t = r[a]?.transcript;
      if (t) out.push(t.trim());
    }
  }
  return out;
}

export function friendlyError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone blocked. Allow it in the address bar, or type the phrase instead.';
    case 'no-speech':
      return 'Did not hear anything. Try again.';
    case 'audio-capture':
      return 'No microphone found.';
    case 'network':
      return 'Speech service unreachable. Type the phrase instead.';
    case 'aborted':
      return '';
    default:
      return `Could not listen (${code}).`;
  }
}
