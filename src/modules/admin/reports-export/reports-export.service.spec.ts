import { Test, TestingModule } from '@nestjs/testing';
import { ReportsExportService } from './reports-export.service';

describe('ReportsExportService', () => {
  let service: ReportsExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsExportService],
    }).compile();

    service = module.get<ReportsExportService>(ReportsExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
