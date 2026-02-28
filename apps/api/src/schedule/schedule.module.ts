import { Module, forwardRef } from '@nestjs/common';
import { ShiftsModule } from '../shifts/shifts.module';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [forwardRef(() => ShiftsModule)],
  controllers: [ScheduleController],
  providers: [ScheduleService]
})
export class ScheduleModule { }
