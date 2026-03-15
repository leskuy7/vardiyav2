import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, title: string, message: string, type: string, actionUrl?: string) {
        return this.prisma.notification.create({
            data: { userId, title, message, type, actionUrl },
        });
    }

    async createMany(userIds: string[], title: string, message: string, type: string, actionUrl?: string) {
        return this.prisma.notification.createMany({
            data: userIds.map((userId) => ({ userId, title, message, type, actionUrl })),
        });
    }

    async listForUser(userId: string, limit = 50) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    async unreadCount(userId: string) {
        return this.prisma.notification.count({
            where: { userId, isRead: false },
        });
    }

    async markAsRead(id: string, userId: string) {
        return this.prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true },
        });
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
}
