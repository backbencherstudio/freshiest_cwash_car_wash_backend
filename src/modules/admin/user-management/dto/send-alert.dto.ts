import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendAlertDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  data?: Record<string, string>;
}
