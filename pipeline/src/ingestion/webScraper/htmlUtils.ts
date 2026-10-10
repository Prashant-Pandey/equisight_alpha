/**
 * HTML and RSS entity decoding and plaintext cleanup utilities.
 */

/**
 * Strips HTML tags, unwraps CDATA, decodes HTML entities, and normalizes whitespace
 * to extract pure plain text from RSS descriptions or HTML snippets.
 */
export function extractTextFromHtml(raw: string): string {
  if (!raw) return '';
  let text = raw.replace(/<!\[CDATA\[|\]\]>/g, '');
  const decodeEntities = (s: string) =>
    s
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&#39;/gi, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#160;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

  text = decodeEntities(text);
  text = decodeEntities(text);
  text = text.replace(/<[^>]*>/g, ' ');
  text = decodeEntities(text);
  return text.replace(/\s+/g, ' ').trim();
}
