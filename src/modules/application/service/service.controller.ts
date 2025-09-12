import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, UseGuards, Req } from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';

@ApiTags('Service')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.WASHER, Role.USER)
@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) { }

  @ApiOperation({ summary: 'Create a new service' })
  @Post()
  @UseInterceptors(FileInterceptor('image')) // Interceptor for handling file upload (image)
  async create(@Body() createServiceDto: CreateServiceDto, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    try {
      const userId = req.user?.userId;
      const service = await this.serviceService.create(createServiceDto, file, userId);
      return service;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Find all services (with optional search query)' })
  @Get()
  async findAll(@Query('q') searchQuery: string | null) {
    try {
      const services = await this.serviceService.findAll(searchQuery);
      return services;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Find a single service by ID' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const service = await this.serviceService.findOne(id);
      return service;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Update an existing service' })
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image')) // Interceptor for handling file upload (image)
  async update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto, @UploadedFile() file: Express.Multer.File) {
    try {
      const service = await this.serviceService.update(id, updateServiceDto, file);
      return service;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Delete a service by ID' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const service = await this.serviceService.remove(id);
      return service;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
