import { Test, TestingModule } from '@nestjs/testing';
import { LeaveBalancesController } from './leave-balances.controller';
import { LeaveBalancesService } from './leave-balances.service';

describe('LeaveBalancesController', () => {
  let controller: LeaveBalancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveBalancesController],
      providers: [{ provide: LeaveBalancesService, useValue: {} }],
    }).compile();

    controller = module.get<LeaveBalancesController>(LeaveBalancesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
