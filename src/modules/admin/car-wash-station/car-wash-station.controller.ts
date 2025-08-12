import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UploadedFile,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { CarWashStationService } from './car-wash-station.service';
import { CreateCarWashStationDto } from './dto/create-car-wash-station.dto';
import { UpdateCarWashStationDto } from './dto/update-car-wash-station.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Car Wash Station')
@Controller('car-wash-station')
export class CarWashStationController {
  constructor(private readonly carWashStationService: CarWashStationService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WASHER)
  @ApiOperation({ summary: 'Create a new car wash station' })
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createCarWashStationDto: CreateCarWashStationDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.userId;
      const carWashStation = await this.carWashStationService.create(createCarWashStationDto, file, userId);
      return carWashStation;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Read all car wash stations' })
  @Get()
  async findAll(@Query() query: { q?: string }) {
    try {
      const searchQuery = query.q;
      const carWashStations = await this.carWashStationService.findAll(searchQuery);
      return carWashStations;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Read one car wash station' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const carWashStation = await this.carWashStationService.findOne(id);
      return carWashStation;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WASHER)
  @ApiOperation({ summary: 'Update a car wash station' })
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateCarWashStationDto: UpdateCarWashStationDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const carWashStation = await this.carWashStationService.update(id, updateCarWashStationDto, file);
      return carWashStation;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WASHER)
  @ApiOperation({ summary: 'Delete a car wash station' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const carWashStation = await this.carWashStationService.remove(id);
      return carWashStation;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
