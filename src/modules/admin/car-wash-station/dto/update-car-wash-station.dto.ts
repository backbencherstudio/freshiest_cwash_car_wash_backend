import { PartialType } from '@nestjs/swagger';
import { CreateCarWashStationDto } from './create-car-wash-station.dto';

export class UpdateCarWashStationDto extends PartialType(CreateCarWashStationDto) {}
