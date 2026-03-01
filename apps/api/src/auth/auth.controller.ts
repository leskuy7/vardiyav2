import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuditService } from '../common/audit.service';
import { CsrfGuard } from '../common/auth/csrf.guard';
import { AuthService } from './auth.service';
import { BootstrapGuard } from './bootstrap.guard';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService
  ) { }

  @Post('bootstrap-admin')
  @UseGuards(BootstrapGuard)
  async bootstrapAdmin(@Body() dto: BootstrapAdminDto) {
    return this.authService.bootstrapAdmin(dto);
  }

  @Post('login')
  @Throttle({
    default: {
      ttl: Number(process.env.LOGIN_THROTTLE_TTL ?? 60_000),
      limit: Number(process.env.LOGIN_THROTTLE_LIMIT ?? 5)
    }
  })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(response, result.refreshToken);
    await this.auditService.log({
      userId: result.user.id,
      action: 'AUTH_LOGIN',
      entityType: 'USER',
      entityId: result.user.id,
      details: { role: result.user.role }
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @UseGuards(CsrfGuard)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const token = request.cookies?.refresh_token as string | undefined;
    if (!token) {
      throw new UnauthorizedException({ code: 'REFRESH_MISSING', message: 'Refresh token cookie missing' });
    }

    const payload = await this.authService.validateRefreshToken(token);
    const result = await this.authService.refresh(payload.sub, token);
    this.setRefreshCookie(response, result.refreshToken);

    return { accessToken: result.accessToken, user: result.user };
  }

  @UseGuards(JwtAuthGuard)
  @UseGuards(CsrfGuard)
  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const user = request.user as { sub: string };
    const result = await this.authService.logout(user.sub);
    await this.auditService.log({
      userId: user.sub,
      action: 'AUTH_LOGOUT',
      entityType: 'USER',
      entityId: user.sub
    });
    response.clearCookie('refresh_token');
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: Request) {
    const user = request.user as { sub: string };
    return this.authService.me(user.sub);
  }

  private setRefreshCookie(response: Response, token: string) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    response.cookie('refresh_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }
}
