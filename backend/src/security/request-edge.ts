import type { Request } from 'express';

// What the edge check (edge-client.middleware.ts) learned about a
// request: whether it came through the frontend, and the client IP the
// frontend read from Vercel, if it sent one. Kept off the Request type
// itself so nothing else mistakes it for Express's own req.ip.
export type EdgeInfo = { verified: boolean; clientIp: string | null };

const edgeInfo = new WeakMap<Request, EdgeInfo>();

export function setEdgeInfo(req: Request, info: EdgeInfo): void {
  edgeInfo.set(req, info);
}

export function getEdgeInfo(req: Request): EdgeInfo {
  return edgeInfo.get(req) ?? { verified: false, clientIp: null };
}

// The headers the frontend sets; any copy a client sends is replaced
// there (frontend/lib/edge-headers.ts).
export const EDGE_HEADERS = {
  key: 'x-tlv-edge-key',
  clientIp: 'x-tlv-client-ip',
  source: 'x-tlv-source',
} as const;
