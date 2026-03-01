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
@Roles('ADMIN', 'MANAGER')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly auditService: AuditService
  ) { }

  @Get()
  list(@Req() request: Request, @Query('active') active?: string) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    if (active === undefined) return this.employeesService.list(undefined, actor);
    return this.employeesService.list(active === 'true', actor);
  }

  @Get(':id/credentials')
  getCredentials(@Param('id') id: string, @Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    return this.employeesService.getCredentials(id, actor);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    return this.employeesService.getById(id, actor);
  }

  @Post()
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

  @Patch(':id')
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
