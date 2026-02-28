import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SwapRequestsController } from './swap-requests.controller';
import { SwapRequestsService } from './swap-requests.service';

@Module({
    imports: [DatabaseModule],
    controllers: [SwapRequestsController],
    providers: [SwapRequestsService],
    exports: [SwapRequestsService]
})
export class SwapRequestsModule { }
