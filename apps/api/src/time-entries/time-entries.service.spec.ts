import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { TimeEntriesService } from './time-entries.service';

describe('TimeEntriesService', () => {
  let service: TimeEntriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeEntriesService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<TimeEntriesService>(TimeEntriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
