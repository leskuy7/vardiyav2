import { Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async list(@Request() req: any) {
        const userId = req.user?.sub;
        const [items, unreadCount] = await Promise.all([
            this.notificationsService.listForUser(userId),
            this.notificationsService.unreadCount(userId),
        ]);
        return { items, unreadCount };
    }

    @Get('unread-count')
    async getUnreadCount(@Request() req: any) {
        const count = await this.notificationsService.unreadCount(req.user?.sub);
        return { count };
    }

    @Patch(':id/read')
    async markAsRead(@Param('id') id: string, @Request() req: any) {
        await this.notificationsService.markAsRead(id, req.user?.sub);
        return { success: true };
    }

    @Post('read-all')
    async markAllAsRead(@Request() req: any) {
        await this.notificationsService.markAllAsRead(req.user?.sub);
        return { success: true };
    }
}
