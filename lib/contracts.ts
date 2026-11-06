export const MAX_DREAM_LENGTH = 500;

export type Dream = {
  id: string;
  dream: string;
  createdAt: string;
  hidden: boolean;
};

export type WallSnapshot = {
  round: number;
  revision: number;
  dreams: Dream[];
};

// Projector slides show every character without shrinking long submissions to
// unreadable type. Whitespace is condensed only for presentation.
export function dreamParts(dream: string): string[] {
  const graphemes = Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(dream.replace(/\s+/gu, " ")), s => s.segment);
  const parts: string[] = [];
  for (let i = 0; i < graphemes.length; i += 64) parts.push(graphemes.slice(i, i + 64).join(""));
  return parts;
}
