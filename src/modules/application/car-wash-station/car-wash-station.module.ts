import { Module } from '@nestjs/common';
import { CarWashStationService } from './car-wash-station.service';
import { CarWashStationController } from './car-wash-station.controller';

@Module({
  controllers: [CarWashStationController],
  providers: [CarWashStationService],
})
export class CarWashStationModule {}
