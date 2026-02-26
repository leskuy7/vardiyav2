import { Module } from '@nestjs/common';
import { AuditService } from '../common/audit.service';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';

@Module({
  controllers: [ShiftsController],
  providers: [ShiftsService, AuditService],
  exports: [ShiftsService]
})
export class ShiftsModule {}
