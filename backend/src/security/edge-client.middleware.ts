import { timingSafeEqual } from 'crypto';
import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { clientIpKey } from './client-ip';
import { readEdgeConfig, type EdgeConfig } from './edge-config';
import { EDGE_HEADERS, setEdgeInfo } from './request-edge';
import { SecurityLog } from './security-log.service';

// Runs before everything else (ADR 010). X-Forwarded-For, X-Real-IP and
// Express's req.ip are never read: on the direct path to Render they are
// whatever the caller chose. The client IP comes only from
// x-tlv-client-ip, and only on a request carrying the edge key, which
// only the frontend has.
@Injectable()
export class EdgeClientMiddleware implements NestMiddleware {
  private readonly edge: EdgeConfig;

  constructor(
    config: ConfigService,
    private readonly log: SecurityLog,
  ) {
    this.edge = readEdgeConfig(config);
  }

  use(req: Request, _res: Response, next: NextFunction) {
    const verified = this.hasEdgeKey(req);
    const clientIp = verified ? clientIpKey(req.get(EDGE_HEADERS.clientIp)) : null;
    setEdgeInfo(req, { verified, clientIp });

    if (this.edge.key && !verified && !isHealthCheck(req)) {
      this.log.edgeUnverified(area(req));
      if (this.edge.enforce) throw new ForbiddenException();
    }
    // A browser request through the frontend should always carry the
    // client IP; on Vercel, its absence means the header didn't arrive.
    if (verified && !clientIp && req.get(EDGE_HEADERS.source) === 'browser') {
      this.log.edgeClientIpMissing(area(req));
    }
    next();
  }

  private hasEdgeKey(req: Request): boolean {
    const sent = req.get(EDGE_HEADERS.key);
    if (!this.edge.key || !sent) return false;
    const given = Buffer.from(sent);
    return given.length === this.edge.key.length && timingSafeEqual(given, this.edge.key);
  }
}

// The full path as requested. Not req.path: inside middleware that is
// relative to where Nest mounted it.
function pathOf(req: Request): string {
  return new URL(req.originalUrl, 'http://api.invalid').pathname;
}

function isHealthCheck(req: Request): boolean {
  const path = pathOf(req);
  return path === '/health' || path.startsWith('/health/');
}

// The first path segment only ("auth", "theses"): enough to see where
// unverified traffic goes, without ids or anything a caller typed.
function area(req: Request): string {
  const first = pathOf(req).split('/')[1] ?? '';
  return /^[a-z-]{1,20}$/.test(first) ? first : 'other';
}
