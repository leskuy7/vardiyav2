import { Body, Controller, Get, Patch, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { SettingsService } from './settings.service';
import { PrismaService } from '../database/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
    constructor(
        private readonly settingsService: SettingsService,
        private readonly prisma: PrismaService,
    ) { }

    private async getOrgId(userId: string) {
        const org = await this.prisma.organization.findUnique({ where: { adminUserId: userId }, select: { id: true } });
        return org?.id;
    }

    @Get()
    @Roles('ADMIN')
    async get(@Request() req: any) {
        const orgId = await this.getOrgId(req.user?.sub);
        if (!orgId) throw new ForbiddenException('Organizasyon bulunamadı');
        return this.settingsService.getForOrganization(orgId);
    }

    @Patch()
    @Roles('ADMIN')
  async update(@Request() req: any, @Body() dto: UpdateSettingsDto) {
        const orgId = await this.getOrgId(req.user?.sub);
        if (!orgId) throw new ForbiddenException('Organizasyon bulunamadı');
        return this.settingsService.update(orgId, dto);
    }
}
