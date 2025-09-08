import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { AvailabilityModule } from './availability/availability.module';
import { CarWashStationModule } from './car-wash-station/car-wash-station.module';
import { ServiceModule } from './service/service.module';
import { ReviewModule } from './review/review.module';
import { BookingModule } from './booking/booking.module';
import { WithdrawModule } from './withdraw/withdraw.module';

@Module({
  imports: [
    NotificationModule,
    ContactModule,
    FaqModule,
    AvailabilityModule,
    CarWashStationModule,
    ServiceModule,
    ReviewModule,
    BookingModule,
    WithdrawModule,
  ],
})
export class ApplicationModule { }
