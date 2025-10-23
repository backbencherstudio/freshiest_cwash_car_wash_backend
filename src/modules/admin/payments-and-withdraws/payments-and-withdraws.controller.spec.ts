import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsAndWithdrawsController } from './payments-and-withdraws.controller';
import { PaymentsAndWithdrawsService } from './payments-and-withdraws.service';

describe('PaymentsAndWithdrawsController', () => {
  let controller: PaymentsAndWithdrawsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsAndWithdrawsController],
      providers: [PaymentsAndWithdrawsService],
    }).compile();

    controller = module.get<PaymentsAndWithdrawsController>(PaymentsAndWithdrawsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
