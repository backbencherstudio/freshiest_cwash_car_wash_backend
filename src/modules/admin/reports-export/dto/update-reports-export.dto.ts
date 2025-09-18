import { PartialType } from '@nestjs/swagger';
import { CreateReportsExportDto } from './create-reports-export.dto';

export class UpdateReportsExportDto extends PartialType(CreateReportsExportDto) {}
