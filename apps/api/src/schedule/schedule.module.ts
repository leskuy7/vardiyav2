import { Module, forwardRef } from '@nestjs/common';
import { HolidaysModule } from '../holidays/holidays.module';
import { SettingsModule } from '../settings/settings.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { AutoScheduleService } from './auto-schedule.service';

@Module({
  imports: [forwardRef(() => ShiftsModule), HolidaysModule, SettingsModule],
  controllers: [ScheduleController],
  providers: [ScheduleService, AutoScheduleService]
})
export class ScheduleModule { }
