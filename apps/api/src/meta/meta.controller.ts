import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { MetaService } from './meta.service';

@Controller('meta')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get('departments')
  departments() {
    return this.metaService.departments();
  }

  @Get('positions')
  positions() {
    return this.metaService.positions();
  }
}
