import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { LeaveBalancesController } from './leave-balances.controller';
import { LeaveBalancesService } from './leave-balances.service';

describe('LeaveBalancesController', () => {
  let controller: LeaveBalancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveBalancesController],
      providers: [
        { provide: LeaveBalancesService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => 'http://localhost:3000' } },
        Reflector,
      ],
    }).compile();

    controller = module.get<LeaveBalancesController>(LeaveBalancesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
