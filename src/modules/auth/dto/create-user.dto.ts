import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @ApiProperty()
  name?: string;

  // @IsNotEmpty()
  // @ApiProperty()
  // @Optional()
  // first_name?: string;

  // @IsNotEmpty()
  // @ApiProperty()
  // @Optional()
  // last_name?: string;

  @IsNotEmpty()
  @ApiProperty()
  email?: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password should be minimum 8' })
  @ApiProperty()
  password: string;

  @ApiProperty({
    type: String,
    example: 'user',
  })
  type?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Firebase Cloud Messaging token for push notifications',
  })
  @IsOptional()
  fcm_token?: string;
}
