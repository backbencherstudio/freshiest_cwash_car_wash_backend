import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { BookingStatus } from './filter-reports.dto';

export class BookingQueryDto {
  @ApiProperty({ 
    description: 'Booking status tab', 
    enum: BookingStatus,
    required: false,
    example: BookingStatus.ALL
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  tab?: BookingStatus = BookingStatus.ALL;

  @ApiProperty({ 
    description: 'Page number for pagination', 
    required: false,
    example: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ 
    description: 'Number of items per page', 
    required: false,
    example: 10
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 10;
}
