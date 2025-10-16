import { IsString, IsDateString, IsOptional, IsArray, ValidateNested, IsISO8601, IsInt, IsBoolean, Min, Max, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Define the enum values for validation
const DayOfWeekValues = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export class CreateAvailabilityDto {
  @IsString()
  @IsOptional()
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

  @IsString()
  opening_time: string; // e.g., '08:00 AM' - REQUIRED for automatic time slot generation

  @IsString()
  closing_time: string; // e.g., '10:00 PM' - REQUIRED for automatic time slot generation

  @IsInt()
  @Min(1)
  @Max(1440) // Max 24 hours in minutes
  slot_duration_minutes: number; // e.g., 60 for 1 hour - REQUIRED for automatic time slot generation

  @IsOptional()
  @IsBoolean()
  is_closed?: boolean; // full-day closure flag

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateBulkAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityDto)
  availabilities: CreateAvailabilityDto[];
}

// New DTO for creating availability rules
export class CreateAvailabilityRuleDto {
  @IsString()
  @IsOptional()
  car_wash_station_id: string;

  @IsString()
  opening_time: string; // e.g., '08:00 AM'

  @IsString()
  closing_time: string; // e.g., '10:00 PM'

  @IsInt()
  @Min(1)
  @Max(1440) // Max 24 hours in minutes
  slot_duration_minutes: number; // e.g., 60 for 1 hour

  @IsArray()
  @IsEnum(DayOfWeekValues, { each: true })
  days_open: string[]; // e.g., ['MONDAY', 'TUESDAY', 'WEDNESDAY']
}

// DTO for generating availabilities from rules
export class GenerateAvailabilityFromRuleDto {

  @IsISO8601()
  start_date: string;

  @IsISO8601()
  end_date: string;

  @IsOptional()
  @IsBoolean()
  overwrite_existing?: boolean; // whether to overwrite existing availabilities
}
