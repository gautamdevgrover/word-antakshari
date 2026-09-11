import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const rawWords: string[] = require("an-array-of-english-words");

export const MIN_WORD_LENGTH = 3;

// Fast in-memory lookup set of all lowercase English words
export const englishWordSet: Set<string> = new Set(
  rawWords.map((w) => w.toLowerCase().trim()).filter((w) => w.length >= MIN_WORD_LENGTH && /^[a-z]+$/.test(w))
);

export interface WordValidationResult {
  valid: boolean;
  error?: string;
  word?: string;
  score?: number;
  nextLetter?: string;
}

/**
 * Calculates score for a valid word.
 * Base score is 1 point per letter. Bonus +2 points for words with 6 or more letters.
 */
export function calculateWordScore(word: string): number {
  const len = word.length;
  const bonus = len >= 6 ? 2 : 0;
  return len + bonus;
}

/**
 * Validates a submitted word against:
 * 1. Character format (English alphabet only)
 * 2. Minimum length
 * 3. Starting letter match (if requiredLetter is specified)
 * 4. Duplicate usage in current round
 * 5. English dictionary presence
 */
export function validateWord(
  rawInput: string,
  requiredLetter: string | null,
  usedWords: Set<string> | string[]
): WordValidationResult {
  if (!rawInput || typeof rawInput !== "string") {
    return { valid: false, error: "Please enter a word." };
  }

  const word = rawInput.trim().toLowerCase();

  if (!/^[a-z]+$/.test(word)) {
    return { valid: false, error: "Words can only contain English letters." };
  }

  if (word.length < MIN_WORD_LENGTH) {
    return { valid: false, error: `Words must be at least ${MIN_WORD_LENGTH} letters long.` };
  }

  if (requiredLetter) {
    const expected = requiredLetter.toLowerCase();
    if (word[0] !== expected) {
      return {
        valid: false,
        error: `Word must start with the letter "${expected.toUpperCase()}".`,
      };
    }
  }

  const usedSet = usedWords instanceof Set ? usedWords : new Set(usedWords.map((w) => w.toLowerCase()));
  if (usedSet.has(word)) {
    return { valid: false, error: `"${word.toUpperCase()}" has already been used in this round!` };
  }

  if (!englishWordSet.has(word)) {
    return { valid: false, error: `"${word.toUpperCase()}" is not a recognized English word.` };
  }

  const score = calculateWordScore(word);
  const nextLetter = word[word.length - 1];

  return {
    valid: true,
    word,
    score,
    nextLetter,
  };
}
