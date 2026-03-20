import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import {
  DEFAULT_PRINT_FORM_CONFIG,
  mergePrintFormConfig,
  normalizePrintFormConfig,
} from './print-form-config';

@Injectable()
export class SettingsService {
    constructor(private readonly prisma: PrismaService) { }

    async getForOrganization(organizationId: string) {
        let settings = await this.prisma.orgSettings.findUnique({ where: { organizationId } });
        if (!settings) {
            settings = await this.prisma.orgSettings.create({
              data: {
                organizationId,
                printFormConfig: DEFAULT_PRINT_FORM_CONFIG,
              },
            });
        }
        return {
          ...settings,
          printFormConfig: normalizePrintFormConfig(settings.printFormConfig),
        };
    }

  async update(organizationId: string, dto: UpdateSettingsDto) {
    const current = await this.getForOrganization(organizationId);
    const nextMinDuration = dto.shiftMinDuration ?? current.shiftMinDuration;
    const nextMaxDuration = dto.shiftMaxDuration ?? current.shiftMaxDuration;

    if (nextMinDuration > nextMaxDuration) {
      throw new BadRequestException({
        code: 'INVALID_SHIFT_DURATION_RANGE',
        message: 'Minimum vardiya süresi maksimum vardiya süresinden büyük olamaz.'
      });
    }

    const normalizedWorkDays = dto.workDays
      ? Array.from(new Set(dto.workDays)).sort((left, right) => left - right)
      : undefined;
    const nextPrintFormConfig = dto.printFormConfig
      ? mergePrintFormConfig(current.printFormConfig, dto.printFormConfig)
      : current.printFormConfig;

    const settings = await this.prisma.orgSettings.upsert({
      where: { organizationId },
      update: {
        ...dto,
        printFormConfig: nextPrintFormConfig,
        ...(normalizedWorkDays ? { workDays: normalizedWorkDays } : {})
      },
      create: {
        organizationId,
        ...dto,
        printFormConfig: nextPrintFormConfig,
        ...(normalizedWorkDays ? { workDays: normalizedWorkDays } : {})
      }
    });

    return {
      ...settings,
      printFormConfig: normalizePrintFormConfig(settings.printFormConfig),
    };
  }
}
