import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateServiceDto {
    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsNumber()
    @Transform(({ value }) => parseFloat(value))
    price: number;

    @IsOptional()
    @IsString()
    status: string;

    @IsString()
    @IsOptional()
    car_wash_station_id: string;  // Add this field to link to CarWashStation
}
