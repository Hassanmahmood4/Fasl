import { apiUrl } from "@/lib/apiUrl";
import type { Report } from "@/lib/demo/types";

export type AssistantLanguage = "en" | "ur";

export type ChatTurn = {
  role: "user" | "assistant";
  text: string;
  language: AssistantLanguage;
};

const TIMEOUT_MS = 30_000;

export class AssistantError extends Error {}

const NOT_CONNECTED = "The assistant isn’t connected yet. Please try again later.";
const FAILED = "The assistant couldn’t answer right now. Please try again.";

/**
 * Sends a question about the current report to the chatbot backend.
 *
 * Backend contract (built separately):
 *   POST /api/chat (see lib/apiUrl.ts)
 *   body:     { message: string, language: "en" | "ur", report: Report, history: ChatTurn[] }
 *   response: { reply: string }
 * The reply should be in the language given, Urdu in Urdu script.
 */
export async function askAssistant(
  message: string,
  language: AssistantLanguage,
  report: Report,
  history: ChatTurn[],
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(apiUrl("/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, language, report, history }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AssistantError(NOT_CONNECTED);
  }

  if (response.status === 404) throw new AssistantError(NOT_CONNECTED);
  if (!response.ok) throw new AssistantError(FAILED);

  const data: unknown = await response.json().catch(() => null);
  if (
    typeof data !== "object" ||
    data === null ||
    !("reply" in data) ||
    typeof data.reply !== "string" ||
    data.reply.trim() === ""
  ) {
    throw new AssistantError(FAILED);
  }
  return data.reply.trim();
}
