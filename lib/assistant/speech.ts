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

/** Whether this device can read replies aloud in the language. */
export function canSpeak(language: AssistantLanguage): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return language === "en" || Boolean(findVoice(language));
}

/** Reads text aloud. Returns false when there's no voice for the language. */
export function speak(text: string, language: AssistantLanguage, onEnd?: () => void): boolean {
  if (!canSpeak(language)) return false;
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
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
