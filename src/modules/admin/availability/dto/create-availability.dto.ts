import { IsString, IsDateString, IsOptional, IsArray, ValidateNested, IsISO8601 } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateTimeSlotDto {
  @IsString()
  start_time: string; // e.g., '09.00 AM'

  @IsString()
  end_time: string; // e.g., '10.00 AM'
}

export class CreateAvailabilityDto {
  @IsString()
  day: string;

  @IsISO8601()
  @Transform(({ value }) => {
    // Ensure the date is properly formatted for Prisma
    if (typeof value === 'string') {
      // If it's already a valid ISO string, return as is
      if (value.includes('T') || value.includes('Z')) {
        return value;
      }
      // If it's just a date string (e.g., '2024-01-01'), convert to full ISO string
      return new Date(value).toISOString();
    }
    return value;
  })
  date: string;

  @IsString()
  car_wash_station_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTimeSlotDto)
  @IsOptional()
  timeSlots?: CreateTimeSlotDto[]; // Array of time slot data to create
}

export class CreateBulkAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityDto)
  availabilities: CreateAvailabilityDto[];
}
