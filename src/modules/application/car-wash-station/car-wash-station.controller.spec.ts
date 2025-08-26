import { Test, TestingModule } from '@nestjs/testing';
import { CarWashStationController } from './car-wash-station.controller';
import { CarWashStationService } from './car-wash-station.service';

describe('CarWashStationController', () => {
  let controller: CarWashStationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarWashStationController],
      providers: [CarWashStationService],
    }).compile();

    controller = module.get<CarWashStationController>(CarWashStationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
