import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

function extractAccessTokenFromCookie(request: { cookies?: Record<string, string | undefined> }) {
  return request.cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractAccessTokenFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret
    });
  }

  validate(payload: { sub: string; email: string; role: string; employeeId?: string; organizationId?: string }) {
    return payload;
  }
}
