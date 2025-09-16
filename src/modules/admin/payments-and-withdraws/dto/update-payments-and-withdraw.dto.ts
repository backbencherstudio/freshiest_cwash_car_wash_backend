import { PartialType } from '@nestjs/swagger';
import { CreatePaymentsAndWithdrawDto } from './create-payments-and-withdraw.dto';

export class UpdatePaymentsAndWithdrawDto extends PartialType(CreatePaymentsAndWithdrawDto) {}
