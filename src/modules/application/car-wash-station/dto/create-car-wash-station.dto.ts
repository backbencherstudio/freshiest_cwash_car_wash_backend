import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsLatitude,
} from 'class-validator';

export class CreateCarWashStationDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  price_per_wash: number;

  @IsString()
  location: string;

  @IsNumber()
  @IsLatitude()
  @Transform(({ value }) => parseFloat(value))
  latitude: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  longitude: number;

  @IsOptional()
  @IsString()
  phone_number?: string;
}
