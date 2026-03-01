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

  async bootstrapAdmin(dto: {
    businessTypeCode: string;
    organizationName?: string;
    adminName?: string;
  }) {
    const businessType = await this.prisma.businessType.findUnique({
      where: { code: dto.businessTypeCode.toUpperCase() },
      include: { businessTemplates: true },
    });
    if (!businessType) {
      throw new UnauthorizedException({
        code: "UNKNOWN_BUSINESS_TYPE",
        message: `Unknown business type: ${dto.businessTypeCode}`,
      });
    }

    const login = await this.generateUniqueLogin();
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const name = (dto.adminName ?? "Admin").trim() || "Admin";
    const orgName = (dto.organizationName ?? businessType.name).trim() || businessType.name;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: login,
          name,
          passwordHash,
          role: "ADMIN",
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          businessTypeId: businessType.id,
          adminUserId: user.id,
        },
      });

      if (businessType.businessTemplates.length > 0) {
        await tx.orgSuggestion.createMany({
          data: businessType.businessTemplates.map((t) => ({
            organizationId: organization.id,
            kind: t.kind,
            value: t.value,
          })),
          skipDuplicates: true,
        });
      }

      return { user, organization };
    });

    const tokens = await this.issueTokens(
      result.user.id,
      result.user.email,
      result.user.role,
      undefined,
    );
    await this.storeRefreshTokenHash(result.user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        employee: null,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        businessTypeCode: businessType.code,
      },
      generatedEmail: result.user.email,
      generatedPassword: tempPassword,
    };
  }

  private async generateUniqueLogin(): Promise<string> {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    for (let attempt = 0; attempt < 50; attempt++) {
      let login = "";
      for (let i = 0; i < 6; i++) {
        login += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.prisma.user.findUnique({ where: { email: login } });
      if (!existing) return login;
    }
    throw new Error("Could not generate unique login");
  }

  private generateTempPassword(): string {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghjkmnpqrstuvwxyz";
    const digits = "23456789";
    const special = "!@#$%&*";
    let p = "";
    p += upper.charAt(Math.floor(Math.random() * upper.length));
    p += lower.charAt(Math.floor(Math.random() * lower.length));
    p += digits.charAt(Math.floor(Math.random() * digits.length));
    p += special.charAt(Math.floor(Math.random() * special.length));
    for (let i = 0; i < 8; i++) {
      const pool = upper + lower + digits + special;
      p += pool.charAt(Math.floor(Math.random() * pool.length));
    }
    return p.split("").sort(() => Math.random() - 0.5).join("");
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
