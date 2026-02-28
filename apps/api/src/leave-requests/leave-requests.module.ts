import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequestsController } from './leave-requests.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService],
  exports: [LeaveRequestsService]
})
export class LeaveRequestsModule { }
