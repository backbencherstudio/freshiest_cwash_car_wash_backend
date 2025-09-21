import { Test, TestingModule } from '@nestjs/testing';
import { ShopManagementService } from './shop-management.service';

describe('ShopManagementService', () => {
  let service: ShopManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShopManagementService],
    }).compile();

    service = module.get<ShopManagementService>(ShopManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
