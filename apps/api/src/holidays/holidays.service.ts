import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plusDays, toIsoDate } from '../common/time.utils';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HolidaysService {
  constructor(private readonly prisma: PrismaService) { }

  async list(year?: number) {
    if (year == null) {
      return this.prisma.publicHoliday.findMany({
        orderBy: { date: 'asc' }
      });
    }

    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
    return this.listForRange(start, end);
  }

  async listForRange(start: Date, end: Date) {
    const [exactHolidays, recurringHolidays] = await Promise.all([
      this.prisma.publicHoliday.findMany({
        where: {
          date: { gte: start, lt: end }
        },
        orderBy: { date: 'asc' }
      }),
      this.prisma.publicHoliday.findMany({
        where: { isRecurring: true },
        orderBy: { date: 'asc' }
      })
    ]);

    const byDate = new Map<string, { id: string; name: string; date: Date; isRecurring: boolean }>();

    for (const holiday of exactHolidays) {
      byDate.set(toIsoDate(holiday.date), holiday);
    }

    const startYear = start.getUTCFullYear();
    const endYear = end.getUTCFullYear();
    for (const holiday of recurringHolidays) {
      const month = holiday.date.getUTCMonth();
      const day = holiday.date.getUTCDate();
      for (let year = startYear; year <= endYear; year += 1) {
        const occurrence = new Date(Date.UTC(year, month, day));
        if (occurrence < start || occurrence >= end) {
          continue;
        }

        const isoDate = toIsoDate(occurrence);
        if (!byDate.has(isoDate)) {
          byDate.set(isoDate, {
            id: holiday.id,
            name: holiday.name,
            date: occurrence,
            isRecurring: true
          });
        }
      }
    }

    return Array.from(byDate.values()).sort((left, right) => left.date.getTime() - right.date.getTime());
  }

  async create(name: string, date: string, isRecurring = false) {
    try {
      return await this.prisma.publicHoliday.create({
        data: { name: name.trim(), date: new Date(`${date}T00:00:00.000Z`), isRecurring }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'HOLIDAY_DATE_EXISTS',
          message: 'Bu tarih için zaten bir resmi tatil tanımlı.'
        });
      }
      throw error;
    }
  }

  async remove(id: string) {
    return this.prisma.publicHoliday.delete({ where: { id } });
  }

  async isHoliday(date: Date): Promise<boolean> {
    const dayStart = new Date(`${toIsoDate(date)}T00:00:00.000Z`);
    const matches = await this.listForRange(dayStart, plusDays(dayStart, 1));
    return matches.length > 0;
  }
}
