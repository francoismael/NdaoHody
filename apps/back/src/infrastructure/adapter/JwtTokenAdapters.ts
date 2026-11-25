import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccessToken, AccessTokenService, AdminTokenService } from '../../application/port/AccessTokenService';

const ALGORITHM = 'HS256';

interface TokenPayload {
  sub: string;
}

/** Signs and checks HS256 tokens for one audience. Each audience has its own secret. */
class JwtTokens {
  private readonly jwt: JwtService;

  constructor(
    secret: string,
    private readonly audience: string,
  ) {
    this.jwt = new JwtService({ secret });
  }

  issue(accountId: number, expiresInSeconds: number): AccessToken {
    const token = this.jwt.sign(
      { sub: String(accountId) },
      { expiresIn: expiresInSeconds, audience: this.audience, algorithm: ALGORITHM },
    );
    return { token, expiresInSeconds };
  }

  verify(token: string): number | null {
    try {
      const payload = this.jwt.verify<TokenPayload>(token, { audience: this.audience, algorithms: [ALGORITHM] });
      const accountId = Number(payload.sub);
      return Number.isInteger(accountId) && accountId > 0 ? accountId : null;
    } catch {
      return null;
    }
  }
}

/** Tokens of the native app (JWT_ACCESS_SECRET). */
@Injectable()
export class JwtAccessTokenAdapter extends AccessTokenService {
  private readonly tokens: JwtTokens;

  constructor(config: ConfigService) {
    super();
    this.tokens = new JwtTokens(config.getOrThrow<string>('JWT_ACCESS_SECRET'), 'ndaohody-app');
  }

  issue(accountId: number, expiresInSeconds: number): AccessToken {
    return this.tokens.issue(accountId, expiresInSeconds);
  }

  verify(token: string): number | null {
    return this.tokens.verify(token);
  }
}

/** Tokens of the back-office (JWT_ADMIN_SECRET). */
@Injectable()
export class JwtAdminTokenAdapter extends AdminTokenService {
  private readonly tokens: JwtTokens;

  constructor(config: ConfigService) {
    super();
    this.tokens = new JwtTokens(config.getOrThrow<string>('JWT_ADMIN_SECRET'), 'ndaohody-admin');
  }

  issue(accountId: number, expiresInSeconds: number): AccessToken {
    return this.tokens.issue(accountId, expiresInSeconds);
  }

  verify(token: string): number | null {
    return this.tokens.verify(token);
  }
}
