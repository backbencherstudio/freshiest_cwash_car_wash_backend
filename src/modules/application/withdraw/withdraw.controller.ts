import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { WithdrawService } from './withdraw.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('withdraw')
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) { }

  @Get('weekly-income')
  async weeklyIncome(@Req() req: any) {
    return this.withdrawService.getWeeklyIncome(req.user.id);
  }

  @Get('available')
  async available(@Req() req: any) {
    return this.withdrawService.getAvailableAmount(req.user.id);
  }

  @Post('request')
  async request(@Req() req: any, @Body() body: { amount: number; via?: string }) {
    return this.withdrawService.requestWithdraw(req.user.id, Number(body.amount), body.via);
  }
}

