import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { BootstrapGuard } from './bootstrap.guard';

describe('BootstrapGuard', () => {
  const createContext = (key: string | undefined): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-bootstrap-key': key } }),
      }),
    }) as ExecutionContext;

  it('rejects when BOOTSTRAP_SECRET is not set', () => {
    const guard = new BootstrapGuard({ get: () => undefined } as any);
    expect(() => guard.canActivate(createContext('any'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when header is missing', () => {
    const guard = new BootstrapGuard({ get: () => 'secret' } as any);
    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when header does not match', () => {
    const guard = new BootstrapGuard({ get: () => 'secret' } as any);
    expect(() => guard.canActivate(createContext('wrong'))).toThrow(
      UnauthorizedException,
    );
  });

  it('allows when header matches secret', () => {
    const guard = new BootstrapGuard({ get: () => 'secret' } as any);
    expect(guard.canActivate(createContext('secret'))).toBe(true);
  });
});
