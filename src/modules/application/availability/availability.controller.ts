import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto, CreateAvailabilityRuleDto, GenerateAvailabilityFromRuleDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';


@UseGuards(JwtAuthGuard)
@Roles(Role.WASHER, Role.USER)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) { }

  @Post()
  create(@Body() createAvailabilityDto: CreateAvailabilityDto, @Req() req: any) {
    const user_id = req.user?.userId;
    return this.availabilityService.create(createAvailabilityDto, user_id);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('carWashStationId') carWashStationId?: string,
    @Query('date') date?: string,
    @Query('isClosed') isClosed?: string,
    @Query('userId') userId?: string,
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    const filters: any = {};
    if (carWashStationId) filters.car_wash_station_id = carWashStationId;
    if (date) filters.date = date;
    if (isClosed !== undefined) filters.is_closed = isClosed === 'true';
    if (userId) filters.user_id = userId;

    return this.availabilityService.findAll(pageNum, limitNum, filters);
  }

  @Get('available-today')
  availableToday(@Req() req: any) {
    const user_id = req.user?.userId;
    return this.availabilityService.availableToday(user_id);
  }

  @Get('time-slots')
  getAvailableTimeSlots(
    @Query('bookingDate') bookingDate: string,
    @Query('carWashStationId') carWashStationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Req() req: any,
  ) {
    const user_id = req.user?.userId;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    return this.availabilityService.getAvailableTimeSlots(bookingDate, carWashStationId, user_id, pageNum, limitNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.availabilityService.findOne(id);
  }

  @Roles(Role.WASHER, Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
    @Req() req: any,
  ) {
    const user_id = req.user?.userId;
    return this.availabilityService.update(id, updateAvailabilityDto);
  }

  @Roles(Role.WASHER, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.availabilityService.remove(id);
  }

  // ===== AVAILABILITY RULE MANAGEMENT =====

  @Roles(Role.WASHER)
  @Post('rules')
  createAvailabilityRule(@Body() createAvailabilityRuleDto: CreateAvailabilityRuleDto, @Req() req: any) {
    const user_id = req.user?.userId;
    return this.availabilityService.createAvailabilityRule(createAvailabilityRuleDto, user_id);
  }

  @Roles(Role.WASHER)
  @Post('rules/:ruleId/generate')
  generateAvailabilityFromRule(
    @Param('ruleId') ruleId: string,
    @Body() generateDto: GenerateAvailabilityFromRuleDto,
    @Req() req: any,
  ) {
    const user_id = req.user?.userId;
    return this.availabilityService.generateAvailabilityFromRule(generateDto, user_id, ruleId);
  }

  @Get('rules/:carWashStationId')
  getAvailabilityRules(
    @Param('carWashStationId') carWashStationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    return this.availabilityService.getAvailabilityRules(carWashStationId, pageNum, limitNum);
  }

  @Roles(Role.WASHER)
  @Delete('rules/:ruleId')
  deleteAvailabilityRule(@Param('ruleId') ruleId: string, @Req() req: any) {
    const user_id = req.user?.userId;
    return this.availabilityService.deleteAvailabilityRule(ruleId, user_id);
  }

  @Roles(Role.WASHER)
  @Patch('rules/:ruleId')
  updateAvailabilityRule(
    @Param('ruleId') ruleId: string,
    @Body() body: Partial<CreateAvailabilityRuleDto>,
    @Req() req: any,
  ) {
    const user_id = req.user?.userId;
    return this.availabilityService.updateAvailabilityRule(ruleId, body, user_id);
  }
}
