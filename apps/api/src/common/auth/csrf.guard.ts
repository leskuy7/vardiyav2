import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function normalizeOrigin(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; method: string }>();

    const unsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase());
    if (!unsafeMethod) {
      return true;
    }

    const raw = this.config.get<string>('CSRF_ORIGINS') ?? this.config.get<string>('CSRF_ORIGIN') ?? '';
    const allowed = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(normalizeOrigin)
      .filter(Boolean);

    if (allowed.length === 0) {
      throw new UnauthorizedException({ code: 'CSRF_BLOCKED', message: 'CSRF_ORIGINS is not configured' });
    }

    const origin = request.headers.origin;
    const referer = request.headers.referer;

    const originOk = origin ? allowed.includes(normalizeOrigin(origin)) : false;
    const refererOk = referer ? allowed.includes(normalizeOrigin(referer)) : false;

    if (!originOk && !refererOk) {
      throw new UnauthorizedException({ code: 'CSRF_BLOCKED', message: 'Origin/Referer check failed' });
    }

    return true;
  }
}
