import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; method: string }>();

    const unsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase());
    if (!unsafeMethod) {
      return true;
    }

    const allowedOrigin = this.config.get<string>('CSRF_ORIGIN');
    if (!allowedOrigin) {
      throw new UnauthorizedException({ code: 'CSRF_BLOCKED', message: 'CSRF_ORIGIN is not configured' });
    }

    const origin = request.headers.origin;
    const referer = request.headers.referer;

    const originOk = origin === allowedOrigin;
    const refererOk = Boolean(referer?.startsWith(allowedOrigin));

    if (!originOk && !refererOk) {
      throw new UnauthorizedException({ code: 'CSRF_BLOCKED', message: 'Origin/Referer check failed' });
    }

    return true;
  }
}
