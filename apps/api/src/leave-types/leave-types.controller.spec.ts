import { Test, TestingModule } from '@nestjs/testing';
import { LeaveTypesController } from './leave-types.controller';
import { LeaveTypesService } from './leave-types.service';

describe('LeaveTypesController', () => {
  let controller: LeaveTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveTypesController],
      providers: [{ provide: LeaveTypesService, useValue: {} }],
    }).compile();

    controller = module.get<LeaveTypesController>(LeaveTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
