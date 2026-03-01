import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from '../common/audit.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [ConfigModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, AuditService],
  exports: [EmployeesService]
})
export class EmployeesModule {}
