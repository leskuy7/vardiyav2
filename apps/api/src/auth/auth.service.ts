import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { JwtSignOptions } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../database/prisma.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get accessSecret() {
    const secret = this.config.get<string>("JWT_ACCESS_SECRET");
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is required");
    }
    return secret;
  }

  private get refreshSecret() {
    const secret = this.config.get<string>("JWT_REFRESH_SECRET");
    if (!secret) {
      throw new Error("JWT_REFRESH_SECRET is required");
    }
    return secret;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { employee: true },
    });
    if (!user) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.role,
      user.employee?.id,
    );
    await this.storeRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        employee: user.employee,
      },
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException({
        code: "INVALID_REFRESH_TOKEN",
        message: "Invalid refresh token",
      });
    }

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) {
      throw new UnauthorizedException({
        code: "INVALID_REFRESH_TOKEN",
        message: "Invalid refresh token",
      });
    }

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.role,
      user.employee?.id,
    );
    await this.storeRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        employee: user.employee,
      },
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { message: "Logged out" };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "User not logged in or token invalid",
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      employee: user.employee,
    };
  }

  async validateAccessToken(token: string) {
    try {
      return this.jwt.verify(token, { secret: this.accessSecret });
    } catch {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Invalid access token",
      });
    }
  }

  async validateRefreshToken(token: string) {
    try {
      return this.jwt.verify(token, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Invalid refresh token",
      });
    }
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
    employeeId?: string,
  ) {
    const payload = { sub: userId, email, role, employeeId };
    const accessExpiresIn = (this.config.get<string>("JWT_ACCESS_EXPIRES_IN") ??
      "15m") as JwtSignOptions["expiresIn"];
    const refreshExpiresIn = (this.config.get<string>(
      "JWT_REFRESH_EXPIRES_IN",
    ) ?? "7d") as JwtSignOptions["expiresIn"];

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwt.signAsync(payload, {
        secret: this.refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }
}
