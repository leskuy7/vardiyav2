import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  function createService() {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn()
      },
      employee: {
        create: jest.fn()
      },
      $transaction: jest.fn()
    };

    const jwt = {
      signAsync: jest.fn().mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token'),
      verify: jest.fn()
    };

    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d'
        };
        return values[key];
      })
    };

    return {
      service: new AuthService(
        prisma as unknown as ConstructorParameters<typeof AuthService>[0],
        jwt as unknown as ConstructorParameters<typeof AuthService>[1],
        config as unknown as ConstructorParameters<typeof AuthService>[2]
      ),
      prisma,
      jwt,
      config
    };
  }

  it('kullanıcı yoksa login 401 döner', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login({ email: 'missing@example.com', password: 'Test12345!' })).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it('şifre yanlışsa login 401 döner', async () => {
    const { service, prisma } = createService();
    const passwordHash = await bcrypt.hash('Correct123!', 10);

    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      passwordHash,
      role: 'EMPLOYEE',
      employee: null
    });

    await expect(service.login({ email: 'user@example.com', password: 'Wrong12345!' })).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });
});
