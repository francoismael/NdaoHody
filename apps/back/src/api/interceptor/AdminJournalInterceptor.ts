import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Clock } from '../../application/port/Clock';
import { bestEffort } from '../../application/helper/bestEffort';
import { AdminJournalRepository } from '../../domain/repository/AdminJournalRepository';
import type { AdminRequest } from '../guard/AdminAccessGuard';

export const AUDIT_KEY = 'adminAudit';

export interface AuditMetadata {
  /** e.g. "chauffeur.valider". */
  action: string;
  cibleType: string;
}

/** Fields never copied into the journal. */
const SECRET_FIELDS = /mot.?de.?passe|password|token/i;
const MAX_DETAILS_LENGTH = 1000;

/**
 * Writes every successful back-office write (any method but GET) in journal_admin:
 * who, what (@Audit() or "METHOD /path"), on which target (:id), with the reason or the body.
 */
@Injectable()
export class AdminJournalInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminJournalInterceptor.name);

  constructor(
    private readonly journal: AdminJournalRepository,
    private readonly clock: Clock,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (request.method === 'GET' || !request.admin) {
      return next.handle();
    }
    const audit = this.reflector.get<AuditMetadata | undefined>(AUDIT_KEY, context.getHandler());
    return next.handle().pipe(tap(() => void this.record(request, audit)));
  }

  private record(request: AdminRequest, audit: AuditMetadata | undefined): Promise<void> {
    const targetId = Number(request.params['id']);
    const entry = {
      administrateurId: request.admin.id,
      action: audit?.action ?? `${request.method} ${request.route?.path ?? request.path}`,
      cibleType: audit?.cibleType ?? null,
      cibleId: Number.isInteger(targetId) ? targetId : null,
      details: describeBody(request.body),
      dateAction: this.clock.now(),
    };
    return bestEffort(this.logger, `Admin action not written in the journal (${entry.action})`, this.journal.add(entry));
  }
}

function describeBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (typeof record['motif'] === 'string') {
    return record['motif'];
  }
  const visible = Object.fromEntries(Object.entries(record).filter(([key]) => !SECRET_FIELDS.test(key)));
  return Object.keys(visible).length > 0 ? JSON.stringify(visible).slice(0, MAX_DETAILS_LENGTH) : null;
}
