import { Test, TestingModule } from '@nestjs/testing';
import { ShopManagementController } from './shop-management.controller';
import { ShopManagementService } from './shop-management.service';

describe('ShopManagementController', () => {
  let controller: ShopManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopManagementController],
      providers: [ShopManagementService],
    }).compile();

    controller = module.get<ShopManagementController>(ShopManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
