import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto, CreateBulkAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';


@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) { }

  @Post()
  create(@Body() createAvailabilityDto: CreateAvailabilityDto, @Req() req: any) {
    const user_id = req.user?.userId;
    return this.availabilityService.create(createAvailabilityDto, user_id);
  }

  @Post('bulk')
  createBulk(@Body() createBulkAvailabilityDto: CreateBulkAvailabilityDto, @Req() req: any) {
    const user_id = req.user?.userId;
    return this.availabilityService.createBulk(createBulkAvailabilityDto, user_id);
  }

  @Get()
  findAll(@Query('search') searchQuery: string | null) {
    return this.availabilityService.findAll(searchQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.availabilityService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.update(id, updateAvailabilityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.availabilityService.remove(id);
  }
}
