/**
 * Peer group and competitor benchmarking matrix assembly.
 */

import type { CompetitorBenchmarkingMatrix, PeerComparisonRow } from '../../types.js';
import type { RawFundamentalInput } from './types.js';

export function buildCompetitorBenchmarking(
  raw: RawFundamentalInput,
  currentPE: number | null,
  competitiveMoatRating: string,
  roic: number | null
): CompetitorBenchmarkingMatrix {
  const peerRows: PeerComparisonRow[] = [
    {
      ticker: raw.ticker,
      name: raw.companyName,
      marketCap: raw.marketCap,
      peRatio: currentPE,
      evToEbitda: raw.evToEbitda,
      moat: competitiveMoatRating,
      roic: roic
    }
  ];

  const candidatePeers = (raw.peerTickers && raw.peerTickers.length > 0)
    ? raw.peerTickers
    : Object.keys(raw.peerData || {});
  const cleanPeerTickers = candidatePeers.filter(t => t.toUpperCase() !== raw.ticker.toUpperCase()).slice(0, 3);

  for (const pTicker of cleanPeerTickers) {
    const liveP = raw.peerData?.[pTicker];
    peerRows.push({
      ticker: pTicker,
      name: liveP?.name || pTicker,
      marketCap: liveP?.marketCap ?? 0,
      peRatio: (liveP?.trailingPE ?? liveP?.forwardPE) ? parseFloat((liveP.trailingPE ?? liveP.forwardPE)!.toFixed(1)) : null,
      evToEbitda: (typeof liveP?.evToEbitda === 'number') ? parseFloat(liveP.evToEbitda.toFixed(1)) : null,
      moat: 'Unrated',
      roic: (typeof liveP?.roic === 'number') ? parseFloat(liveP.roic.toFixed(1)) : null
    });
  }

  const commentary = cleanPeerTickers.length > 0
    ? `${raw.companyName} trades at ${currentPE ? currentPE + 'x P/E' : 'unreported P/E'} against peer group participants (${cleanPeerTickers.join(', ')}), supported by a ${competitiveMoatRating} classification.`
    : `${raw.companyName} evaluated against broader ${raw.sector} valuation benchmarks, supported by a ${competitiveMoatRating} classification.`;

  return { peers: peerRows, commentary };
}
