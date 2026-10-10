/**
 * Segment revenue breakdown parsing from business description.
 */

import type { SegmentBreakdownItem } from '../../types.js';

export function extractSegmentBreakdown(text?: string, revenueTTM?: number): SegmentBreakdownItem[] {
  if (!text) return [];
  const segments: SegmentBreakdownItem[] = [];

  // Pattern 1: "operates through [X] segments: [A], [B], and [C]"
  const segMatch = text.match(/(?:operates through|consists of|organized into|divided into)\s+(?:two|three|four|five|six|seven|\d+)?\s*segments?:\s*([^.]+)/i);
  if (segMatch && segMatch[1]) {
    const rawSegs = segMatch[1]
      .split(/,\s*|\s+and\s+/i)
      .map(s => s.trim().replace(/^and\s+/i, ''))
      .filter(s => s.length > 2 && s.length < 50);

    for (const seg of rawSegs) {
      segments.push({ segment: seg });
    }
  }

  // Pattern 2: "offers [A], [B], and [C]"
  if (segments.length === 0) {
    const offerMatch = text.match(/(?:offers|products include|portfolio includes)\s+([^.]+)/i);
    if (offerMatch && offerMatch[1]) {
      const items = offerMatch[1]
        .split(/,\s*|\s+and\s+/i)
        .map(s => s.trim().replace(/^and\s+/i, ''))
        .filter(s => s.length > 2 && s.length < 50)
        .slice(0, 5);

      for (const it of items) {
        segments.push({ segment: it });
      }
    }
  }

  return segments;
}
