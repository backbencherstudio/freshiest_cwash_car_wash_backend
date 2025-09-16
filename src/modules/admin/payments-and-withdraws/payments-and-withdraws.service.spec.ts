import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsAndWithdrawsService } from './payments-and-withdraws.service';

describe('PaymentsAndWithdrawsService', () => {
  let service: PaymentsAndWithdrawsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsAndWithdrawsService],
    }).compile();

    service = module.get<PaymentsAndWithdrawsService>(PaymentsAndWithdrawsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
