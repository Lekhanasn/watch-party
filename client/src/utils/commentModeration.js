const abusiveWords = ["spam", "idiot", "stupid", "hate", "nonsense", "kill", "moron"];
const specialCharacterPattern = /([!@#$%^&*()_+={}\[\]\|\\;:'",.<>/?`~])\1+/;
const spamPattern = /(buy now|click here|free money|earn cash|guaranteed profit)/i;

export function isSafeComment(text) {
  const normalized = `${text || ""}`.toLowerCase();
  const containsAbuse = abusiveWords.some((word) => normalized.includes(word));
  const containsSpamPattern = spamPattern.test(normalized);
  const repeatedSpecialChars = specialCharacterPattern.test(normalized);
  const repeatedWordPattern = /(?:\b\w+\b)\s+\1\b/i.test(normalized);

  return !(containsAbuse || containsSpamPattern || repeatedSpecialChars || repeatedWordPattern);
}

export function translateComment(text, language = "en") {
  if (!text) return "";
  if (language === "en") return text;
  return `[${language.toUpperCase()}] ${text}`;
}
