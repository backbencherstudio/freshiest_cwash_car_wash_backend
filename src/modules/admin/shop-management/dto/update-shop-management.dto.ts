import { PartialType } from '@nestjs/swagger';
import { CreateShopManagementDto } from './create-shop-management.dto';

export class UpdateShopManagementDto extends PartialType(CreateShopManagementDto) {}
