"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/apiUrl";
import type { AssistantLanguage } from "./api";

/** Browser speech codes for each language. */
const SPEECH_LANG: Record<AssistantLanguage, string> = { en: "en-US", ur: "ur-PK" };

/* The Web Speech API isn't in TypeScript's DOM types yet, so describe the parts we use. */
type RecognitionResultEvent = {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
type RecognitionErrorEvent = { error: string };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => Recognition;

function recognitionClass(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

type SpeechInputOptions = {
  language: AssistantLanguage;
  /** Called with the words heard so far, as they come in. */
  onInterim: (text: string) => void;
  /** Called once with the full sentence when the speaker stops. */
  onFinal: (text: string) => void;
  onError: (message: string) => void;
};

/** Turns speech into text, in English or Urdu. */
export function useSpeechInput({ language, onInterim, onFinal, onError }: SpeechInputOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const handlers = useRef({ onInterim, onFinal, onError });
  handlers.current = { onInterim, onFinal, onError };

  useEffect(() => {
    setSupported(Boolean(recognitionClass()));
    return () => recognition.current?.abort();
  }, []);

  const stop = useCallback(() => recognition.current?.stop(), []);

  const start = useCallback(() => {
    const Recognition = recognitionClass();
    if (!Recognition) return;
    recognition.current?.abort();

    const r = new Recognition();
    r.lang = SPEECH_LANG[language];
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";

    r.onresult = (event) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      handlers.current.onInterim((finalText + interim).trim());
    };
    r.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      handlers.current.onError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone access was blocked. Allow it in your browser to speak."
          : "Voice input didn’t work. Please try again or type instead.",
      );
    };
    r.onend = () => {
      setListening(false);
      if (finalText.trim()) handlers.current.onFinal(finalText.trim());
    };

    recognition.current = r;
    setListening(true);
    r.start();
  }, [language]);

  return { supported, listening, start, stop };
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
