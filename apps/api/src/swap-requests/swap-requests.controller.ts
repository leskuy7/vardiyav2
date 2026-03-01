import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { ApproveSwapRequestDto } from './dto/approve-swap-request.dto';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { SwapRequestsService } from './swap-requests.service';

@Controller('swap-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SwapRequestsController {
    constructor(private readonly swapRequestsService: SwapRequestsService) { }

    @Post()
    @Roles('EMPLOYEE')
    async create(@Body() dto: CreateSwapRequestDto, @Req() req: Request) {
        const actor = req.user as { role: string; employeeId?: string };
        return this.swapRequestsService.create(dto, actor);
    }

    @Post(':id/approve')
    @Roles('ADMIN', 'MANAGER')
    async approve(@Param('id') id: string, @Body() body: ApproveSwapRequestDto, @Req() req: Request) {
        const actor = req.user as { role: string; employeeId?: string };
        return this.swapRequestsService.approve(id, actor, body?.targetEmployeeId);
    }

    @Post(':id/reject')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    async reject(@Param('id') id: string, @Req() req: Request) {
        const actor = req.user as { role: string; employeeId?: string };
        return this.swapRequestsService.reject(id, actor);
    }
}
