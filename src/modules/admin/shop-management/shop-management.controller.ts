import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ValidationPipe, UsePipes } from '@nestjs/common';
import { ShopManagementService } from './shop-management.service';
import { CreateShopManagementDto, CreateProviderDto } from './dto/create-shop-management.dto';
import { UpdateShopManagementDto } from './dto/update-shop-management.dto';
import { ShopQueryDto } from './dto/shop-query.dto';
import { PriceCapsDto } from './dto/price-caps.dto';
import { CreatePromotionDto } from './dto/promotion.dto';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@Controller('admin/shop-management')
@ApiBearerAuth()
@ApiTags('Shop Management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ShopManagementController {
  constructor(private readonly shopManagementService: ShopManagementService) {}

  @Get()
  @ApiOperation({ summary: 'Get all shops with search and filtering' })
  @ApiResponse({ status: 200, description: 'Shops retrieved successfully' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for shop name or location' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  async findAll(@Query() query: ShopQueryDto) {
    return this.shopManagementService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shop by ID' })
  @ApiResponse({ status: 200, description: 'Shop retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async findOne(@Param('id') id: string) {
    return this.shopManagementService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get shop statistics' })
  @ApiResponse({ status: 200, description: 'Shop statistics retrieved successfully' })
  async getShopStats(@Param('id') id: string) {
    return this.shopManagementService.getShopStats(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new shop' })
  @ApiResponse({ status: 201, description: 'Shop created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createShopDto: CreateShopManagementDto) {
    return this.shopManagementService.create(createShopDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shop information' })
  @ApiResponse({ status: 200, description: 'Shop updated successfully' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async update(@Param('id') id: string, @Body() updateShopDto: UpdateShopManagementDto) {
    return this.shopManagementService.update(id, updateShopDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shop' })
  @ApiResponse({ status: 200, description: 'Shop deleted successfully' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async remove(@Param('id') id: string) {
    return this.shopManagementService.remove(id);
  }

  @Post('price-caps')
  @ApiOperation({ summary: 'Set individual price caps for a shop' })
  @ApiResponse({ status: 200, description: 'Price caps set successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async setPriceCaps(@Body() priceCapsDto: PriceCapsDto) {
    return this.shopManagementService.setPriceCaps(priceCapsDto);
  }

  @Post('promotions')
  @ApiOperation({ summary: 'Create a promotion for a shop' })
  @ApiResponse({ status: 201, description: 'Promotion created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createPromotion(@Body() createPromotionDto: CreatePromotionDto) {
    return this.shopManagementService.createPromotion(createPromotionDto);
  }

  @Post('providers')
  @ApiOperation({ summary: 'Create a new provider' })
  @ApiResponse({ status: 201, description: 'Provider created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Provider with this email already exists' })
  @UsePipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true,
    forbidNonWhitelisted: false,
    skipMissingProperties: false,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }))
  async createProvider(@Body() createProviderDto: CreateProviderDto) {
    console.log('Received provider data:', JSON.stringify(createProviderDto, null, 2));
    return this.shopManagementService.createProvider(createProviderDto);
  }
}
