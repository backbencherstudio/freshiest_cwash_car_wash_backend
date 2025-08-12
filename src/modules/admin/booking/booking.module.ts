import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { VoucherModule } from '../voucher/voucher.module';

@Module({
  imports: [PrismaModule, VoucherModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule { }
