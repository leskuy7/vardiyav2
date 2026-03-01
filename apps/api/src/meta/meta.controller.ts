import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CsrfGuard } from '../common/auth/csrf.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { MetaService } from './meta.service';

type Actor = { role: string; sub?: string; employeeId?: string };

@Controller('meta')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  private actor(@Req() request: Request): Actor {
    return request.user as Actor;
  }

  @Get('departments')
  departments(@Req() request: Request) {
    return this.metaService.departments(this.actor(request));
  }

  @Get('positions')
  positions(@Req() request: Request) {
    return this.metaService.positions(this.actor(request));
  }

  @Get('suggestions')
  getSuggestions(@Query('kind') kind: string, @Req() request: Request) {
    const k = kind === 'position' ? 'POSITION' : 'DEPARTMENT';
    return this.metaService.getSuggestions(k, this.actor(request));
  }

  @Get('suggestions/list')
  listSuggestions(@Query('kind') kind: string, @Req() request: Request) {
    const k = kind === 'position' ? 'POSITION' : 'DEPARTMENT';
    return this.metaService.listSuggestionsWithIds(k, this.actor(request));
  }

  @Post('suggestions')
  @UseGuards(CsrfGuard)
  addSuggestion(
    @Body() body: { kind: 'DEPARTMENT' | 'POSITION'; value: string },
    @Req() request: Request
  ) {
    return this.metaService.addSuggestion(body.kind, body.value, this.actor(request));
  }

  @Delete('suggestions/:id')
  @UseGuards(CsrfGuard)
  removeSuggestion(@Param('id') id: string, @Req() request: Request) {
    return this.metaService.removeSuggestion(id, this.actor(request));
  }
}
