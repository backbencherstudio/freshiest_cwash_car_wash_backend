import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';
import { ContactModule } from './contact/contact.module';
import { WebsiteInfoModule } from './website-info/website-info.module';
import { PaymentTransactionModule } from './payment-transaction/payment-transaction.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { CarWashStationModule } from './car-wash-station/car-wash-station.module';
import { ServiceModule } from './service/service.module';
import { AvailabilityModule } from './availability/availability.module';
import { VoucherModule } from './voucher/voucher.module';
import { BookingModule } from './booking/booking.module';

@Module({
  imports: [
    FaqModule,
    ContactModule,
    WebsiteInfoModule,
    PaymentTransactionModule,
    UserModule,
    NotificationModule,
    CarWashStationModule,
    ServiceModule,
    AvailabilityModule,
    VoucherModule,
    BookingModule,
  ],
})
export class AdminModule { }
