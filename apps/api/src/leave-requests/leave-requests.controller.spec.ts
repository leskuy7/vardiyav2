import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';

describe('LeaveRequestsController', () => {
  let controller: LeaveRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveRequestsController],
      providers: [
        { provide: LeaveRequestsService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => 'http://localhost:3000' } },
        Reflector,
      ],
    }).compile();

    controller = module.get<LeaveRequestsController>(LeaveRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
