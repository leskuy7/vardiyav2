import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../common/audit.service';
import { CsrfGuard } from '../common/auth/csrf.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly auditService: AuditService
  ) { }

  /** EMPLOYEE can call this for swap-target dropdown; returns id, name, department only. */
  @Get('swap-targets')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  listSwapTargets(@Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    return this.employeesService.listSwapTargets(actor);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  list(@Req() request: Request, @Query('active') active?: string) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    if (active === undefined) return this.employeesService.list(undefined, actor);
    return this.employeesService.list(active === 'true', actor);
  }

  @Get(':id/credentials')
  @Roles('ADMIN', 'MANAGER')
  getCredentials(@Param('id') id: string, @Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    return this.employeesService.getCredentials(id, actor);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  getById(@Param('id') id: string, @Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    return this.employeesService.getById(id, actor);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(CsrfGuard)
  async create(@Body() dto: CreateEmployeeDto, @Req() request: Request) {
    const actor = request.user as { sub: string; role: string; employeeId?: string };
    const result = await this.employeesService.create(dto, actor);
    const employee = 'employee' in result ? result.employee : result;
    const emp = employee as unknown as { id: string; user: { role: string } };
    await this.auditService.log({
      userId: actor.sub,
      action: 'EMPLOYEE_CREATE',
      entityType: 'EMPLOYEE',
      entityId: emp.id,
      details: { role: emp.user.role }
    });
    return result;
  }

  @Post('bulk-update')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(CsrfGuard)
  async bulkUpdate(@Body() dto: { employeeIds: string[]; patch: Partial<UpdateEmployeeDto> }, @Req() request: Request) {
    const actor = request.user as { sub: string; role: string; employeeId?: string };
    const result = await this.employeesService.bulkUpdate(dto.employeeIds, dto.patch, actor);
    await this.auditService.log({
      userId: actor.sub,
      action: 'EMPLOYEE_BULK_UPDATE',
      entityType: 'EMPLOYEE',
      entityId: 'BULK',
      details: dto
    });
    return result;
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(CsrfGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @Req() request: Request) {
    const actor = request.user as { sub: string; role: string; employeeId?: string };
    const result = await this.employeesService.update(id, dto, actor);
    await this.auditService.log({
      userId: actor.sub,
      action: 'EMPLOYEE_UPDATE',
      entityType: 'EMPLOYEE',
      entityId: id,
      details: dto
    });
    return result;
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(CsrfGuard)
  async remove(@Param('id') id: string, @Req() request: Request) {
    const actor = request.user as { sub: string; role: string; employeeId?: string };
    const result = await this.employeesService.remove(id, actor);
    await this.auditService.log({
      userId: actor.sub,
      action: 'EMPLOYEE_ARCHIVE',
      entityType: 'EMPLOYEE',
      entityId: id
    });
    return result;
  }
}
