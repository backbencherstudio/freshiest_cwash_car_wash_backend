import { IsString, IsDateString, IsOptional, IsNumber, IsDecimal } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBookingDto {

    @IsString()
    service_id: string;

    @IsString()
    @IsOptional()
    car_wash_station_id: string;

    @IsString()
    time_slot_id: string;

    @IsString()
    @IsOptional()
    carType?: string; // e.g., 'Sedan', 'SUV', 'Truck'

    @IsDateString()
    @IsOptional()
    @Transform(({ value }) => {
        // Ensure the date is properly formatted for Prisma
        if (typeof value === 'string') {
            // If it's already a valid ISO string, return as is
            if (value.includes('T') || value.includes('Z')) {
                return value;
            }
            // If it's just a date string, convert to full ISO string
            return new Date(value).toISOString();
        }
        return value;
    })
    bookingDate?: string;

    @IsOptional()
    @IsDecimal()
    total_amount?: string;

    @IsOptional()
    @IsString()
    status?: string; // e.g., 'Pending', 'Completed', 'Cancelled' - has default value

    @IsOptional()
    @IsString()
    payment_status?: string; // e.g., 'pending', 'completed', 'failed' - has default value

    @IsOptional()
    @IsString()
    payment_raw_status?: string;

    @IsOptional()
    @IsDecimal()
    paid_amount?: string;

    @IsOptional()
    @IsString()
    paid_currency?: string;

    @IsOptional()
    @IsString()
    payment_provider?: string; // e.g., 'stripe', 'paypal', 'razorpay'

    @IsOptional()
    @IsString()
    payment_reference_number?: string;

    @IsOptional()
    @IsString()
    payment_provider_charge_type?: string; // e.g., 'fixed', 'percentage'

    @IsOptional()
    @IsDecimal()
    payment_provider_charge?: string;

    @IsOptional()
    @IsString()
    voucher_code?: string; // Optional voucher code for discount
}
