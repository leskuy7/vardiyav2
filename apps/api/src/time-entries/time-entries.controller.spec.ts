import { Test, TestingModule } from '@nestjs/testing';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';

describe('TimeEntriesController', () => {
  let controller: TimeEntriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimeEntriesController],
      providers: [{ provide: TimeEntriesService, useValue: {} }],
    }).compile();

    controller = module.get<TimeEntriesController>(TimeEntriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
