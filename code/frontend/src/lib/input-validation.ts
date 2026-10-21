/**
 * Input validation helpers — reject malicious content before submission.
 * Used by Zod schemas to block prompt phishing, scripts, and file-path-like input.
 */

/** Patterns that suggest prompt-injection / prompt-phishing (case-insensitive) */
const PROMPT_PHISHING_PATTERNS = [
  /\b(ignore|override|disregard)\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|context)\b/i,
  /\b(you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as)\b/i,
  /\b(system\s*:\s*|assistant\s*:\s*|user\s*:\s*)\s*\[/i,
  /\b(print|output|reveal)\s+(your|the)\s+(system\s+)?prompt\b/i,
  /\b(jailbreak|DAN|do\s+anything\s+now)\b/i,
  /<\s*\/?\s*system\s*>/i,
];

/** Patterns that suggest script/code injection in plain text */
const SCRIPT_PATTERNS = [
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
  /\bon\w+\s*=\s*["']?/i, // onclick=, onerror=, etc.
  /\beval\s*\s*\(/i,
  /\b(?:new\s+)?Function\s*\(/i,
  /\bsetTimeout\s*\(/i,
  /\bsetInterval\s*\(/i,
  /document\.(write|cookie|domain)/i,
  /window\.(location|eval)/i,
];

/** Path traversal or file-path-like input */
const FILE_PATH_PATTERNS = [
  /\.\.\s*[\\/]|[\\/]\s*\.\./, // ../ or ..\
  /^[a-zA-Z]:[\\/]/, // Windows drive (e.g. C:\)
  /\b(con|prn|aux|nul|com\d|lpt\d)\b/i, // Reserved names (Windows)
];

function containsPromptPhishing(s: string): boolean {
  if (!s || typeof s !== "string") return false;
  return PROMPT_PHISHING_PATTERNS.some((re) => re.test(s));
}

function containsScriptPattern(s: string): boolean {
  if (!s || typeof s !== "string") return false;
  return SCRIPT_PATTERNS.some((re) => re.test(s));
}

function looksLikeFilePath(s: string): boolean {
  if (!s || typeof s !== "string") return false;
  return FILE_PATH_PATTERNS.some((re) => re.test(s));
}

/**
 * Combined check for string fields. Reject if input contains prompt phishing,
 * script patterns, or file-path-like content. Used before submission so invalid
 * input is not sent to the API.
 */
export function isDisallowedContent(
  s: string
): { ok: false; reason: string } | { ok: true } {
  if (containsPromptPhishing(s)) {
    return { ok: false, reason: "Prompt phishing or injection patterns are not allowed." };
  }
  if (containsScriptPattern(s)) {
    return { ok: false, reason: "Script or code patterns are not allowed." };
  }
  if (looksLikeFilePath(s)) {
    return { ok: false, reason: "File paths are not allowed." };
  }
  return { ok: true };
}
