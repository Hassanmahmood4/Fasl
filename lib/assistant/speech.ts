"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const TTS_TIMEOUT_MS = 20_000;

/* Server voice: the same female Urdu voice (ur-PK-UzmaNeural) as the report audio. */
let current: { audio: HTMLAudioElement; url: string; abort: AbortController } | null = null;

function stopServerAudio() {
  if (!current) return;
  current.abort.abort();
  current.audio.pause();
  URL.revokeObjectURL(current.url);
  current = null;
}

async function playFromServer(text: string, language: AssistantLanguage, onEnd?: () => void): Promise<boolean> {
  const abort = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    abort.abort();
  }, TTS_TIMEOUT_MS);
  current = { audio: new Audio(), url: "", abort }; // lets stopSpeaking() cancel the download
  try {
    const response = await fetch(new URL("/tts", API_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
      signal: abort.signal,
    });
    if (!response.ok) return false;
    const blob = await response.blob();
    if (current?.abort !== abort) return true; // stopped while downloading
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    current = { audio, url, abort };
    const done = () => {
      if (current?.audio === audio) stopServerAudio();
      onEnd?.();
    };
    audio.onended = done;
    audio.onerror = done;
    await audio.play();
    return true;
  } catch {
    // Stopped by the user: nothing more to do. Network error or timeout: let the caller fall back.
    return abort.signal.aborted && !timedOut;
  } finally {
    clearTimeout(timer);
  }
}

function browserCanSpeak(language: AssistantLanguage): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return language === "en" || Boolean(findVoice(language));
}

/** Whether replies can be read aloud in the language. */
export function canSpeak(language: AssistantLanguage): boolean {
  return Boolean(API_URL) || browserCanSpeak(language);
}

/**
 * Reads text aloud with the server voice, falling back to the browser's voice.
 * Returns false when no voice is available at all.
 */
export function speak(text: string, language: AssistantLanguage, onEnd?: () => void): boolean {
  if (!canSpeak(language)) return false;
  stopSpeaking();
  if (API_URL) {
    void playFromServer(text, language, onEnd).then((played) => {
      if (!played && !speakInBrowser(text, language, onEnd)) onEnd?.();
    });
    return true;
  }
  return speakInBrowser(text, language, onEnd);
}

function speakInBrowser(text: string, language: AssistantLanguage, onEnd?: () => void): boolean {
  if (!browserCanSpeak(language)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LANG[language];
  const voice = findVoice(language);
  if (voice) utterance.voice = voice;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  stopServerAudio();
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
