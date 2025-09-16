import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEmail, IsEnum, IsIn } from 'class-validator';

export class CreateProviderDto {
  @ApiProperty({ description: 'Business name', example: 'ABC Car Wash' })
  @IsString()
  businessName: string;

  @ApiProperty({ description: 'City', example: 'New York' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'Email address', example: 'provider@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number', example: '+1234567890' })
  @IsString()
  phone: string;

  @ApiProperty({ 
    description: 'Provider status', 
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    example: 'active'
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: string = 'active';
}

export class CreateShopManagementDto {
  @ApiProperty({ description: 'Shop name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Shop description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Shop location' })
  @IsString()
  location: string;

  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Price per wash', required: false })
  @IsOptional()
  @IsNumber()
  pricePerWash?: number;

  @ApiProperty({ description: 'Shop image URL', required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ description: 'Shop status', required: false, default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'User ID of the shop owner' })
  @IsString()
  userId: string;
}
