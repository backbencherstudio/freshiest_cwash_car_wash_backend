import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@Controller('dashboard/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('provider') provider?: string,
    @Query('rating') rating?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.findAll({
      search,
      provider,
      rating,
      page: page || 1,
      limit: limit || 10,
    });
  }

  @Post(':id/hide')
  async hideReview(@Param('id') id: string) {
    return this.reviewsService.hideReview(id);
  }

  @Post(':id/flag')
  async flagReview(@Param('id') id: string) {
    return this.reviewsService.flagReview(id);
  }

  @Post(':id/warning')
  async sendWarning(@Param('id') id: string) {
    return this.reviewsService.sendWarning(id);
  }

  @Delete(':id')
  async removeReview(@Param('id') id: string) {
    return this.reviewsService.removeReview(id);
  }
}
