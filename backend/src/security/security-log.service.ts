import { createHmac, hkdfSync } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Every security log line the API writes, in one place, so what may and
// may not be logged is decided once (audit item F-08).
//
// Never logged: passwords, tokens, cookies, emails (whole or part), raw
// IP addresses, request bodies, or error messages (a Prisma message can
// quote data). People and addresses appear only as refs: the first 12
// hex characters of an HMAC, so lines about the same person or network
// can be matched up without the log holding who they are. The HMAC key
// is derived from JWT_SECRET, so the refs change if that is rotated.
@Injectable()
export class SecurityLog {
  private readonly logger = new Logger('Security');
  private readonly refKey: Buffer;

  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET') ?? '';
    this.refKey = Buffer.from(hkdfSync('sha256', secret, '', 'the-long-view log refs', 32));
  }

  loginFailed(reason: string, email: string, ip: string | null) {
    this.logger.warn(`auth_login_failed reason=${reason} acctRef=${this.ref(email)} ipRef=${this.ipRef(ip)}`);
  }

  throttled(scope: 'ip' | 'account', policy: string, ip: string | null) {
    this.logger.warn(`auth_throttled scope=${scope} policy=${policy} ipRef=${this.ipRef(ip)}`);
  }

  sessionRejected(reason: 'bad_token' | 'invalid' | 'no_user' | 'ended') {
    this.logger.warn(`auth_session_rejected reason=${reason}`);
  }

  googleFailed(stage: 'guard', reason: string) {
    this.logger.warn(`google_sign_in_failed stage=${stage} reason=${reason}`);
  }

  edgeUnverified(area: string) {
    this.logger.warn(`edge_unverified area=${area}`);
  }

  edgeClientIpMissing(area: string) {
    this.logger.warn(`edge_client_ip_missing area=${area}`);
  }

  storeFull(limiter: string) {
    this.logger.warn(`rate_limit_store_full limiter=${limiter}`);
  }

  serverError(method: string, route: string, error: unknown) {
    const { name, code } = (error ?? {}) as { name?: unknown; code?: unknown };
    this.logger.error(`http_5xx method=${method} route=${route} error=${word(name)} code=${word(code)}`);
  }

  private ipRef(ip: string | null): string {
    return ip ? this.ref(ip) : '-';
  }

  private ref(value: string): string {
    return createHmac('sha256', this.refKey).update(value).digest('hex').slice(0, 12);
  }
}

// An error's name or code, only if it looks like one: never free text.
function word(value: unknown): string {
  return typeof value === 'string' && /^[\w.-]{1,40}$/.test(value) ? value : '-';
}
