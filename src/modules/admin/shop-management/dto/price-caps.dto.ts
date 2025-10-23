import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class PriceCapsDto {
  @ApiProperty({ description: 'Shop ID' })
  @IsString()
  shopId: string;

  @ApiProperty({ description: 'Maximum price cap for basic wash' })
  @IsNumber()
  basicWashCap: number;

  @ApiProperty({ description: 'Maximum price cap for premium wash' })
  @IsNumber()
  premiumWashCap: number;

  @ApiProperty({ description: 'Maximum price cap for deluxe wash' })
  @IsNumber()
  deluxeWashCap: number;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
