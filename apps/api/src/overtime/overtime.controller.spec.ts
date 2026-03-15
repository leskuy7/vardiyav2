import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { OvertimeController } from './overtime.controller';
import { OvertimeService } from './overtime.service';

describe('OvertimeController', () => {
  let controller: OvertimeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OvertimeController],
      providers: [
        { provide: OvertimeService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => 'http://localhost:3000' } },
        Reflector,
      ],
    }).compile();

    controller = module.get<OvertimeController>(OvertimeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
