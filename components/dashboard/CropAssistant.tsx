"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mic, MicOff, Send, Square, Volume2 } from "lucide-react";
import { AssistantError, askAssistant, type AssistantLanguage, type ChatTurn } from "@/lib/assistant/api";
import { speak, stopSpeaking, useSpeechInput } from "@/lib/assistant/speech";
import type { Report } from "@/lib/demo/types";

const COPY: Record<AssistantLanguage, { placeholder: string; hint: string; thinking: string }> = {
  en: {
    placeholder: "Ask about this crop…",
    hint: "Type a question or tap the mic to speak.",
    thinking: "Thinking…",
  },
  ur: {
    placeholder: "اس فصل کے بارے میں پوچھیں…",
    hint: "سوال لکھیں یا بولنے کے لیے مائیک دبائیں۔",
    thinking: "سوچ رہا ہے…",
  },
};

const ICON_BUTTON =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

/** A voice and text chat about the current report, in English or Urdu. */
export function CropAssistant({ report }: { report: Report }) {
  const [language, setLanguage] = useState<AssistantLanguage>("en");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const log = useRef<HTMLDivElement>(null);

  const send = async (text: string, spoken: boolean) => {
    const message = text.trim();
    if (!message || waiting) return;
    const history = turns;
    const asked: ChatTurn = { role: "user", text: message, language };
    setTurns([...history, asked]);
    setDraft("");
    setProblem(null);
    setWaiting(true);
    try {
      const reply = await askAssistant(message, language, report, history);
      const answer: ChatTurn = { role: "assistant", text: reply, language };
      setTurns((current) => [...current, answer]);
      // Spoken questions get spoken answers.
      if (spoken && speak(reply, language, () => setSpeakingIndex(null))) {
        setSpeakingIndex(history.length + 1);
      }
    } catch (error) {
      setProblem(error instanceof AssistantError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setWaiting(false);
    }
  };

  const voice = useSpeechInput({
    language,
    onInterim: setDraft,
    onFinal: (text) => void send(text, true),
    onError: setProblem,
  });

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [turns, waiting]);

  useEffect(() => stopSpeaking, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(draft, false);
  };

  const toggleSpeech = (index: number, turn: ChatTurn) => {
    if (speakingIndex === index) {
      stopSpeaking();
      setSpeakingIndex(null);
      return;
    }
    if (speak(turn.text, turn.language, () => setSpeakingIndex(null))) setSpeakingIndex(index);
    else setProblem("This device has no Urdu voice to read replies aloud.");
  };

  const copy = COPY[language];
  const urdu = language === "ur";

  return (
    <section aria-labelledby="assistant-title" className="mt-5 rounded-2xl border border-wheat bg-wheat-tint/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 id="assistant-title" className="font-display font-bold">
          Ask the crop assistant
        </h4>
        <div role="group" aria-label="Assistant language" className="flex rounded-full border border-wheat-deep bg-white p-0.5">
          {(["en", "ur"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={language === option}
              onClick={() => {
                voice.stop();
                setLanguage(option);
              }}
              className={`rounded-full px-3 py-1 text-caption font-semibold transition-colors ${language === option ? "bg-wheat text-black" : "text-charcoal hover:bg-wheat-tint"}`}
            >
              {option === "en" ? "English" : <span lang="ur" className="font-urdu">اردو</span>}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={log}
        role="log"
        aria-live="polite"
        className="mt-3 max-h-72 min-h-24 space-y-2 overflow-y-auto overscroll-contain"
      >
        {turns.length === 0 && !waiting && (
          <p lang={urdu ? "ur" : "en"} dir={urdu ? "rtl" : "ltr"} className={`text-caption text-charcoal ${urdu ? "font-urdu leading-[2.2]" : ""}`}>
            {copy.hint}
          </p>
        )}
        {turns.map((turn, index) => {
          const isUrdu = turn.language === "ur";
          const mine = turn.role === "user";
          return (
            <div key={index} className={`flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
              <p
                lang={isUrdu ? "ur" : "en"}
                dir="auto"
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 ${mine ? "bg-black text-white" : "bg-white text-black"} ${isUrdu ? "font-urdu leading-[2.2]" : "leading-[1.45]"}`}
              >
                <span className="sr-only">{mine ? "You: " : "Assistant: "}</span>
                {turn.text}
              </p>
              {!mine && (
                <button
                  type="button"
                  onClick={() => toggleSpeech(index, turn)}
                  aria-label={speakingIndex === index ? "Stop reading aloud" : "Read this reply aloud"}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-charcoal hover:bg-wheat"
                >
                  {speakingIndex === index ? <Square aria-hidden="true" className="size-4" /> : <Volume2 aria-hidden="true" className="size-4" />}
                </button>
              )}
            </div>
          );
        })}
        {waiting && (
          <p className="text-caption text-charcoal" lang={urdu ? "ur" : "en"} dir="auto">
            {copy.thinking}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
        {voice.supported && (
          <button
            type="button"
            onClick={voice.listening ? voice.stop : voice.start}
            disabled={waiting}
            aria-label={voice.listening ? "Stop listening" : urdu ? "Speak in Urdu" : "Speak in English"}
            aria-pressed={voice.listening}
            className={`${ICON_BUTTON} ${voice.listening ? "animate-pulse bg-black text-white" : "bg-wheat text-black hover:bg-wheat-deep"}`}
          >
            {voice.listening ? <MicOff aria-hidden="true" className="size-5" /> : <Mic aria-hidden="true" className="size-5" />}
          </button>
        )}
        <label htmlFor="assistant-input" className="sr-only">
          Your question
        </label>
        <input
          id="assistant-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={copy.placeholder}
          lang={urdu ? "ur" : "en"}
          dir="auto"
          autoComplete="off"
          className={`min-w-0 flex-1 rounded-full border border-wheat-deep bg-white px-4 py-2.5 text-black placeholder:text-charcoal focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black ${urdu ? "font-urdu" : ""}`}
        />
        <button
          type="submit"
          disabled={waiting || draft.trim() === ""}
          aria-label="Send question"
          className={`${ICON_BUTTON} bg-black text-white hover:bg-charcoal`}
        >
          <Send aria-hidden="true" className="size-5" />
        </button>
      </form>

      {voice.listening && (
        <p className="mt-2 text-caption font-semibold" role="status">
          Listening{urdu ? " in Urdu" : ""}… tap the mic again to stop.
        </p>
      )}
      {problem && (
        <p role="alert" className="mt-2 text-caption font-semibold text-black">
          {problem}
        </p>
      )}
    </section>
  );
}
