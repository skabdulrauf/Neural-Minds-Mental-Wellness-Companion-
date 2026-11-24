// Sanitize HTML to prevent XSS but preserve readability
export function sanitizeHTML(str: string): string {
  // Only escape dangerous HTML characters, not apostrophes/quotes in text
  const map: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
  };
  return str.replace(/[<>]/g, (s) => map[s] || s);
}

export function validateMessage(msg: string): { valid: boolean; error?: string } {
  if (!msg || msg.trim().length === 0) {
    return { valid: false, error: "It looks like you sent an empty message. What's on your mind?" };
  }
  if (msg.length > 2000) {
    return { valid: false, error: "That's quite a lot to share at once — could you try sharing a bit at a time? I want to give each thought the attention it deserves." };
  }
  return { valid: true };
}
