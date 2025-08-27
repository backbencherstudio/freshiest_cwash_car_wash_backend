import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto, CreateBulkAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';


@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) { }

  @Roles(Role.WASHER)
  @Post()
  create(@Body() createAvailabilityDto: CreateAvailabilityDto, @Req() req: any) {
    const user_id = req.user?.userId;
    return this.availabilityService.create(createAvailabilityDto, user_id);
  }

  @Roles(Role.WASHER)
  @Post('bulk')
  createBulk(@Body() createBulkAvailabilityDto: CreateBulkAvailabilityDto, @Req() req: any) {
    const user_id = req.user?.userId;
    return this.availabilityService.createBulk(createBulkAvailabilityDto, user_id);
  }

  @Get()
  findAll(@Query('search') searchQuery: string | null) {
    return this.availabilityService.findAll(searchQuery);
  }

  @Get('available-today')
  async availableToday() {
    const carWashStations = await this.availabilityService.availableToday();
    return carWashStations;
  }


  @Get('time-slots')
  getAvailableTimeSlots(
    @Query('bookingDate') bookingDate: string,
    @Query('carWashStationId') carWashStationId: string,
    @Req() req: any,
  ) {
    return this.availabilityService.getAvailableTimeSlots(bookingDate, carWashStationId);
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
  ) {
    return this.availabilityService.update(id, updateAvailabilityDto);
  }

  @Roles(Role.WASHER, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.availabilityService.remove(id);
  }
}
