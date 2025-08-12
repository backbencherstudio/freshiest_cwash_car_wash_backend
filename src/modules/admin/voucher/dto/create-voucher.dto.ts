import { IsString, IsNumber, IsBoolean, IsOptional, IsISO8601, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateVoucherDto {
    @IsString()
    code: string; // e.g., 'DISCOUNT20'

    @IsNumber()
    @Min(0)
    @Max(100)
    discount_percentage: number; // e.g., 20 for 20% off

    @IsBoolean()
    @IsOptional()
    is_active?: boolean; // defaults to true

    @IsISO8601()
    @Transform(({ value }) => {
        // Ensure the date is properly formatted for Prisma
        if (typeof value === 'string') {
            // If it's already a valid ISO string, return as is
            if (value.includes('T') || value.includes('Z')) {
                return value;
            }
            // If it's just a date string (e.g., '2024-12-31'), convert to full ISO string
            return new Date(value).toISOString();
        }
        return value;
    })
    expiryDate: string; // e.g., '2024-12-31'
}
