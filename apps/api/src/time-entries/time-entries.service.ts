import { Injectable, UnprocessableEntityException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CheckInDto, CheckOutDto } from './dto/time-entries.dto';

@Injectable()
export class TimeEntriesService {
    constructor(private prisma: PrismaService) { }

    async checkIn(dto: CheckInDto, actorId: string, actorEmployeeId?: string) {
        const targetEmployeeId = dto.employeeId || actorEmployeeId;
        if (!targetEmployeeId) {
            throw new UnprocessableEntityException({
                code: 'EMPLOYEE_ID_REQUIRED',
                message: 'Giriş yapılacak çalışan belirtilmedi'
            });
        }

        const start = new Date(dto.checkInAt);

        // Prevent checking in twice when already OPEN
        const existingOpen = await this.prisma.timeEntry.findFirst({
            where: {
                employeeId: targetEmployeeId,
                status: 'OPEN'
            }
        });

        if (existingOpen) {
            throw new UnprocessableEntityException({
                code: 'ALREADY_CHECKED_IN',
                message: 'Hali hazırda açık bir giriş kaydınız var'
            });
        }

        return this.prisma.timeEntry.create({
            data: {
                employeeId: targetEmployeeId,
                checkInAt: start,
                shiftId: dto.shiftId,
                source: dto.source || 'MANUAL',
                status: 'OPEN'
            }
        });
    }

    async checkOut(id: string, dto: CheckOutDto, actorEmployeeId?: string, actorRole?: string) {
        const entry = await this.prisma.timeEntry.findUnique({ where: { id } });

        if (!entry) throw new NotFoundException({ code: 'TIME_ENTRY_NOT_FOUND', message: 'Kayıt bulunamadı' });

        // Only admins/managers or the owner can check out
        if (actorRole === 'EMPLOYEE' && entry.employeeId !== actorEmployeeId) {
            throw new NotFoundException({ code: 'TIME_ENTRY_NOT_FOUND', message: 'Kayıt bulunamadı' });
        }

        if (entry.status !== 'OPEN') {
            throw new UnprocessableEntityException({
                code: 'ENTRY_NOT_OPEN',
                message: 'Bu kayıt işlemi zaten kapatılmış veya geçersiz'
            });
        }

        const end = new Date(dto.checkOutAt);

        // Check out should be after check in
        if (end <= entry.checkInAt) {
            throw new UnprocessableEntityException({
                code: 'INVALID_TIMEOUT',
                message: 'Çıkış saati, giriş saatinden önce olamaz'
            });
        }

        return this.prisma.timeEntry.update({
            where: { id },
            data: {
                checkOutAt: end,
                endAt: end, // For exclusion constraint
                status: 'CLOSED'
            }
        });
    }
}
