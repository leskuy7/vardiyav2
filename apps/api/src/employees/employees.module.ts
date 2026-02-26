import { Module } from '@nestjs/common';
import { AuditService } from '../common/audit.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService, AuditService],
  exports: [EmployeesService]
})
export class EmployeesModule {}
