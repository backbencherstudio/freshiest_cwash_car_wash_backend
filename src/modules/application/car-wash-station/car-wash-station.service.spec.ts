import { Test, TestingModule } from '@nestjs/testing';
import { CarWashStationService } from './car-wash-station.service';

describe('CarWashStationService', () => {
  let service: CarWashStationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CarWashStationService],
    }).compile();

    service = module.get<CarWashStationService>(CarWashStationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
