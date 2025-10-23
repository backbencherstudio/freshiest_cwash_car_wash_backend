import { Module } from '@nestjs/common';
import { ReportsExportService } from './reports-export.service';
import { ReportsExportController } from './reports-export.controller';

@Module({
  controllers: [ReportsExportController],
  providers: [ReportsExportService],
})
export class ReportsExportModule {}
