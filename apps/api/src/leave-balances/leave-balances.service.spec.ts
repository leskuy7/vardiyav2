import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { LeaveBalancesService } from './leave-balances.service';

describe('LeaveBalancesService', () => {
  let service: LeaveBalancesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveBalancesService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<LeaveBalancesService>(LeaveBalancesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
