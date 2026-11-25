import type { Request } from 'express';
import type { User } from '../../domain/entity/User';

/** Request of an app route once AccessTokenGuard has let it through. */
export interface AuthenticatedRequest extends Request {
  user: User;
}

const BEARER_PREFIX = 'Bearer ';

/** The token of "Authorization: Bearer <token>", or null. */
export function readBearerToken(request: Pick<Request, 'headers'>): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith(BEARER_PREFIX)) {
    return null;
  }
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}
