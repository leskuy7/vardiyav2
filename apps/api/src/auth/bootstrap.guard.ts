import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class BootstrapGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers['x-bootstrap-key'] as string | undefined;
    const secret = this.config.get<string>('BOOTSTRAP_SECRET');
    if (!secret) {
      throw new UnauthorizedException({
        code: 'BOOTSTRAP_DISABLED',
        message: 'Bootstrap is not configured',
      });
    }
    if (!key || key !== secret) {
      throw new UnauthorizedException({
        code: 'INVALID_BOOTSTRAP_KEY',
        message: 'Invalid or missing bootstrap key',
      });
    }
    return true;
  }
}
