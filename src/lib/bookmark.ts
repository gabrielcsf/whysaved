import { OpenRouter } from "@openrouter/sdk";
import { BookmarkRecord } from "./types";

const openrouter = new OpenRouter({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
});

const MODEL =
  import.meta.env.VITE_OPENROUTER_MODEL ||
  "nvidia/nemotron-3-super-120b-a12b:free";

export async function enrichBookmark(
  bookmark: BookmarkRecord,
  onChunk?: (partial: string) => void,
): Promise<BookmarkRecord> {
  const prompt = `
You are enriching a saved bookmark.

Title: ${bookmark.title}
URL: ${bookmark.url}
Reason user saved it: ${bookmark.note}

Generate:
1. A short summary
2. 3 concise tags

Respond in JSON.
`;

  const result = await openrouter.chat.send({
    chatRequest: {
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: MODEL,
      provider: {
        sort: "price",
      },
      stream: true,
    },
  });

  let raw = "";
  for await (const chunk of result) {
    const text = chunk.choices[0].delta.content ?? "";
    raw += text;
    onChunk?.(raw);
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return bookmark;
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    summary?: string;
    tags?: string[];
  };

  return {
    ...bookmark,
    summary: parsed.summary,
    tags: parsed.tags,
  };
}
