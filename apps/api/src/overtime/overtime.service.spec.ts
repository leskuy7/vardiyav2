import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { OvertimeService } from './overtime.service';

describe('OvertimeService', () => {
  let service: OvertimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OvertimeService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<OvertimeService>(OvertimeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
