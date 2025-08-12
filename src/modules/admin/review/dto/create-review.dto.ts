import { Transform } from 'class-transformer';
import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateReviewDto {

    @IsString()
    car_wash_station_id: string;

    @IsInt()
    @Transform(({ value }) => parseInt(value))
    rating: number;  // Rating out of 5 stars (1-5)

    @IsOptional()
    @IsString()
    comment?: string;
}
