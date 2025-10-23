import { Module } from '@nestjs/common';
import { PaymentsAndWithdrawsService } from './payments-and-withdraws.service';
import { PaymentsAndWithdrawsController } from './payments-and-withdraws.controller';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  controllers: [PaymentsAndWithdrawsController],
  providers: [PaymentsAndWithdrawsService, PrismaService],
})
export class PaymentsAndWithdrawsModule {}
