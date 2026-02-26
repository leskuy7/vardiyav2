import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Array<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { role?: string } }>();
    const role = request.user?.role;

    if (!role || !requiredRoles.includes(role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient role' });
    }

    return true;
  }
}
