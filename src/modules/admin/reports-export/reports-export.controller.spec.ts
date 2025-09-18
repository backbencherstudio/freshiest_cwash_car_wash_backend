import { Test, TestingModule } from '@nestjs/testing';
import { ReportsExportController } from './reports-export.controller';
import { ReportsExportService } from './reports-export.service';

describe('ReportsExportController', () => {
  let controller: ReportsExportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsExportController],
      providers: [ReportsExportService],
    }).compile();

    controller = module.get<ReportsExportController>(ReportsExportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
