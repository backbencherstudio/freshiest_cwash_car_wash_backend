import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@Controller('dashboard/user-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  // GET /user-management?page=1&pageSize=20&role=user|washers&q=search&status=active|suspended
  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe('1'), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe('20'), ParseIntPipe) pageSize: number,
    @Query('role') role: 'user' | 'washers' = 'user',
    @Query('q') q?: string,
    @Query('status') status?: 'active' | 'suspended' | 'deleted',
  ) {
    return this.userManagementService.findAll({
      page,
      pageSize,
      role,
      q,
      status,
    });
  }

  // GET /user-management/:id
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userManagementService.findById(id);
  }

  // PATCH /user-management/:id/suspend
  @Patch(':id/suspend')
  async suspend(@Param('id') id: string) {
    return this.userManagementService.suspend(id);
  }

  // PATCH /user-management/:id/restore
  @Patch(':id/restore')
  async restore(@Param('id') id: string) {
    return this.userManagementService.restore(id);
  }

  // DELETE /user-management/:id  (soft delete)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.userManagementService.remove(id);
  }
}
