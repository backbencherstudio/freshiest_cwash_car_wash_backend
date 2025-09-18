import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

export enum BookingStatus {
  ALL = 'all',
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ServiceType {
  ALL = 'all',
  BASIC_WASH = 'basic_wash',
  PREMIUM_WASH = 'premium_wash',
  DELUXE_WASH = 'deluxe_wash'
}

export class FilterReportsDto {
  @ApiProperty({ 
    description: 'Start date for filtering', 
    required: false,
    example: '2025-01-01'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ 
    description: 'End date for filtering', 
    required: false,
    example: '2025-01-31'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ 
    description: 'Booking status filter', 
    enum: BookingStatus,
    required: false,
    example: BookingStatus.ALL
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiProperty({ 
    description: 'Service type filter', 
    enum: ServiceType,
    required: false,
    example: ServiceType.ALL
  })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiProperty({ 
    description: 'Provider filter - all providers or specific provider ID', 
    required: false,
    example: 'all'
  })
  @IsOptional()
  @IsString()
  providerId?: string;
}
