import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function createContext(role?: string) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined })
      })
    } as any;
  }

  it('role gerekmeyen endpointte true döner', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined)
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(createContext('EMPLOYEE'))).toBe(true);
  });

  it('gerekli role sahip kullanıcıya izin verir', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'MANAGER'])
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(createContext('MANAGER'))).toBe(true);
  });

  it('yetkisiz role için ForbiddenException fırlatır', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN'])
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(createContext('EMPLOYEE'))).toThrow(ForbiddenException);
  });
});
