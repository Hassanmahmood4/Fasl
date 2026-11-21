"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/apiUrl";
import type { AssistantLanguage } from "./api";

/** Browser speech codes for each language (used by the browser's fallback voice). */
const SPEECH_LANG: Record<AssistantLanguage, string> = { en: "en-US", ur: "ur-PK" };

/* Voice input: the browser records a short clip and the server transcribes it (api/voice.py).
 * Browser speech recognition only works in Chrome and Edge, and poorly for Urdu, so it isn't used. */
const MAX_RECORDING_MS = 30_000; // keeps uploads far under Vercel's request limit
const SILENCE_AFTER_SPEECH_MS = 1_500; // stop once the speaker has finished
const NO_SPEECH_MS = 8_000; // give up if nobody speaks
const SPEECH_LEVEL = 0.02; // RMS level that counts as talking
const TRANSCRIBE_TIMEOUT_MS = 30_000;
const RECORDER_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

type SpeechInputOptions = {
  language: AssistantLanguage;
  /** Called once with what was said, after the speaker stops. */
  onFinal: (text: string) => void;
  onError: (message: string) => void;
};

function canRecord(): boolean {
  return typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
}

async function transcribe(clip: Blob, language: AssistantLanguage): Promise<string> {
  const form = new FormData();
  form.append("audio", clip, "speech");
  form.append("language", language);
  let response: Response;
  try {
    response = await fetch(apiUrl("/transcribe"), { method: "POST", body: form, signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS) });
  } catch {
    throw new Error("Couldn’t reach the voice service. Check your connection or type instead.");
  }
  if (response.status === 503) throw new Error("Voice input isn’t set up on this server yet. Please type instead.");
  if (!response.ok) throw new Error("Voice input didn’t work. Please try again or type instead.");
  const data = (await response.json().catch(() => null)) as { text?: unknown } | null;
  return typeof data?.text === "string" ? data.text.trim() : "";
}

/** Turns speech into text, in English or Urdu, in any browser with a microphone. */
export function useSpeechInput({ language, onFinal, onError }: SpeechInputOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const cleanup = useRef<() => void>(() => {});
  const handlers = useRef({ onFinal, onError, language });
  handlers.current = { onFinal, onError, language };

  useEffect(() => {
    setSupported(canRecord());
    return () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
      cleanup.current();
    };
  }, []);

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    if (!canRecord() || recorder.current?.state === "recording") return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      handlers.current.onError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone access was blocked. Allow it in your browser’s site settings to speak."
          : name === "NotFoundError"
            ? "No microphone was found on this device."
            : "The microphone couldn’t start. Please try again or type instead.",
      );
      return;
    }

    const mimeType = RECORDER_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    let heardSpeech = false;
    const language = handlers.current.language;

    // Watch the input level so recording stops by itself when the speaker is done.
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const startedAt = Date.now();
    let lastSound = startedAt;
    const timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) sum += v * v;
      const now = Date.now();
      if (Math.sqrt(sum / samples.length) > SPEECH_LEVEL) {
        heardSpeech = true;
        lastSound = now;
      }
      const done =
        now - startedAt > MAX_RECORDING_MS ||
        (heardSpeech && now - lastSound > SILENCE_AFTER_SPEECH_MS) ||
        (!heardSpeech && now - startedAt > NO_SPEECH_MS);
      if (done && rec.state === "recording") rec.stop();
    }, 100);

    cleanup.current = () => {
      window.clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      void context.close().catch(() => undefined);
    };

    rec.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    rec.onstop = async () => {
      cleanup.current();
      cleanup.current = () => {};
      recorder.current = null;
      setListening(false);
      if (!heardSpeech || chunks.length === 0) return;
      setTranscribing(true);
      try {
        const text = await transcribe(new Blob(chunks, { type: rec.mimeType || mimeType || "audio/webm" }), language);
        if (text) handlers.current.onFinal(text);
        else handlers.current.onError("Didn’t catch that. Please try again, a little closer to the mic.");
      } catch (error) {
        handlers.current.onError(error instanceof Error ? error.message : "Voice input didn’t work.");
      } finally {
        setTranscribing(false);
      }
    };

    recorder.current = rec;
    rec.start();
    setListening(true);
  }, []);

  return { supported, listening, transcribing, start, stop };
}

function findVoice(language: AssistantLanguage): SpeechSynthesisVoice | undefined {
  const prefix = language === "ur" ? "ur" : "en";
  return window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.toLowerCase().startsWith(prefix));
}

const TTS_TIMEOUT_MS = 12_000;

/* Server voice: the same female Urdu voice (ur-PK-UzmaNeural) as the report audio.
 * A reply is voiced in pieces: the first sentence is short, so it starts in about a second,
 * and each next piece downloads while the one before it plays. */
type Session = { stop: AbortController; audio: HTMLAudioElement; urls: string[] };
let session: Session | null = null;

const FIRST_PIECE = 120;
const LATER_PIECE = 400;

/** Splits text at sentence ends (English and Urdu punctuation) into pieces for the voice service. */
function pieces(text: string): string[] {
  const sentences = text.split(/(?<=[.!?۔؟])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  let piece = "";
  for (const sentence of sentences) {
    const limit = out.length === 0 ? FIRST_PIECE : LATER_PIECE;
    if (piece && piece.length + sentence.length + 1 > limit) {
      out.push(piece);
      piece = "";
    }
    piece = piece ? `${piece} ${sentence}` : sentence;
  }
  if (piece) out.push(piece);
  return out;
}

function stopServerAudio() {
  if (!session) return;
  session.stop.abort();
  session.audio.pause();
  session.urls.forEach((url) => URL.revokeObjectURL(url));
  session = null;
}

/* Most of the wait is the voice service's fixed start-up per request (~1.5 s), not the text length,
 * so replies are voiced ahead of time: by the time someone taps the speaker, the audio is usually here. */
const PREPARED_LIMIT = 24;
const prepared = new Map<string, Promise<Blob>>();

function download(text: string, language: AssistantLanguage, signal?: AbortSignal): Promise<Blob> {
  const abort = new AbortController();
  const cancel = () => abort.abort();
  signal?.addEventListener("abort", cancel);
  const timer = setTimeout(cancel, TTS_TIMEOUT_MS);
  return fetch(apiUrl("/tts"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
    signal: abort.signal,
  })
    .then((response) => {
      if (!response.ok) throw new Error("Voice service failed");
      return response.blob();
    })
    .finally(() => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    });
}

function prepare(text: string, language: AssistantLanguage): Promise<Blob> {
  const key = `${language}:${text}`;
  let blob = prepared.get(key);
  if (!blob) {
    blob = download(text, language);
    blob.catch(() => prepared.delete(key)); // a failed download is retried on demand
    prepared.set(key, blob);
    if (prepared.size > PREPARED_LIMIT) prepared.delete(prepared.keys().next().value as string);
  }
  return blob;
}

/** Starts voicing a reply in the background, so reading it aloud later starts at once. Never throws. */
export function prepareSpeech(text: string, language: AssistantLanguage) {
  pieces(text).slice(0, 2).forEach((piece) => void prepare(piece, language).catch(() => undefined));
}

/** One piece as an object URL: prepared audio if there is any, otherwise a fresh download. */
async function fetchPiece(text: string, language: AssistantLanguage, s: Session): Promise<string> {
  let blob: Blob;
  try {
    blob = await prepare(text, language);
  } catch {
    blob = await download(text, language, s.stop.signal);
  }
  if (s.stop.signal.aborted) throw new Error("Stopped");
  const url = URL.createObjectURL(blob);
  s.urls.push(url);
  return url;
}

/** Plays one downloaded piece to its end, or until speech is stopped. */
function playPiece(url: string, s: Session): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      s.audio.onended = s.audio.onerror = null;
      s.stop.signal.removeEventListener("abort", done);
      resolve();
    };
    s.audio.onended = done;
    s.audio.onerror = () => reject(new Error("Audio failed"));
    s.stop.signal.addEventListener("abort", done);
    s.audio.src = url;
    s.audio.play().catch(reject);
  });
}

/**
 * Voices the pieces in order, fetching the next while the current one plays.
 * Returns how many pieces played, or null if the user stopped it.
 */
async function playFromServer(parts: string[], language: AssistantLanguage, s: Session, onStart?: () => void): Promise<number | null> {
  let next: Promise<string> | null = fetchPiece(parts[0], language, s);
  for (let i = 0; i < parts.length; i++) {
    let url: string;
    try {
      url = await (next as Promise<string>);
    } catch {
      return s.stop.signal.aborted ? null : i;
    }
    next = i + 1 < parts.length ? fetchPiece(parts[i + 1], language, s) : null;
    next?.catch(() => undefined); // handled when awaited
    try {
      const playing = playPiece(url, s);
      if (i === 0) onStart?.();
      await playing;
    } catch {
      return s.stop.signal.aborted ? null : i;
    }
    if (s.stop.signal.aborted) return null;
  }
  return parts.length;
}

/**
 * Reads text aloud with the server voice, falling back to the browser's voice.
 * onStart fires when sound begins (the button shows a loading state until then).
 */
export function speak(text: string, language: AssistantLanguage, onEnd?: () => void, onStart?: () => void): boolean {
  stopSpeaking();
  const parts = pieces(text);
  if (parts.length === 0) return false;
  // Created inside the click, so browsers that need a tap to play sound allow every piece.
  const s: Session = { stop: new AbortController(), audio: new Audio(), urls: [] };
  session = s;
  void playFromServer(parts, language, s, onStart).then((played) => {
    if (played === null) return; // stopped by the user
    if (session === s) stopServerAudio();
    const rest = parts.slice(played).join(" ");
    if (!rest || !speakInBrowser(rest, language, onEnd, played === 0 ? onStart : undefined)) onEnd?.();
  });
  return true;
}

function browserCanSpeak(language: AssistantLanguage): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return language === "en" || Boolean(findVoice(language));
}

function speakInBrowser(text: string, language: AssistantLanguage, onEnd?: () => void, onStart?: () => void): boolean {
  if (!browserCanSpeak(language)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LANG[language];
  const voice = findVoice(language);
  if (voice) utterance.voice = voice;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  stopServerAudio();
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
