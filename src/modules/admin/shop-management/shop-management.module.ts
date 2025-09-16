import { Module } from '@nestjs/common';
import { ShopManagementService } from './shop-management.service';
import { ShopManagementController } from './shop-management.controller';

@Module({
  controllers: [ShopManagementController],
  providers: [ShopManagementService],
})
export class ShopManagementModule {}
