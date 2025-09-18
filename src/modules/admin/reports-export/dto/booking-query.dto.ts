import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
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
  page?: number = 1;

  @ApiProperty({ 
    description: 'Number of items per page', 
    required: false,
    example: 10
  })
  @IsOptional()
  limit?: number = 10;
}
