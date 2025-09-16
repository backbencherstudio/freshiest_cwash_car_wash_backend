import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PaymentsAndWithdrawsService } from './payments-and-withdraws.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@Controller('dashboard/payments-and-withdraws')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PaymentsAndWithdrawsController {
  constructor(private readonly paymentsAndWithdrawsService: PaymentsAndWithdrawsService) {}


  @Get()
  async findAll() {
    return this.paymentsAndWithdrawsService.findAll();
  }

  
}
