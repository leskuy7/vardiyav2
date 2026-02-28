import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { SwapRequestsService } from './swap-requests.service';

@Controller('swap-requests')
@UseGuards(JwtAuthGuard)
export class SwapRequestsController {
    constructor(private readonly swapRequestsService: SwapRequestsService) { }

    @Post()
    async create(@Body() dto: CreateSwapRequestDto, @Req() req: Request) {
        const actor = req.user as { role: string; employeeId?: string };
        return this.swapRequestsService.create(dto, actor);
    }

    @Post(':id/approve')
    async approve(@Param('id') id: string, @Req() req: Request) {
        const actor = req.user as { role: string; employeeId?: string };
        return this.swapRequestsService.approve(id, actor);
    }

    @Post(':id/reject')
    async reject(@Param('id') id: string, @Req() req: Request) {
        const actor = req.user as { role: string; employeeId?: string };
        return this.swapRequestsService.reject(id, actor);
    }
}
