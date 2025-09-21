import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreatePromotionDto {
  @ApiProperty({ description: 'Shop ID' })
  @IsString()
  shopId: string;

  @ApiProperty({ description: 'Promotion title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Promotion description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Discount percentage' })
  @IsNumber()
  discountPercentage: number;

  @ApiProperty({ description: 'Promotion start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Promotion end date' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Maximum number of uses', required: false })
  @IsOptional()
  @IsNumber()
  maxUses?: number;

  @ApiProperty({ description: 'Is promotion active', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
