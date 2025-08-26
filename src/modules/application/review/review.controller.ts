import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@ApiTags('Review')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new review' })
  @Post()
  async create(@Body() createReviewDto: CreateReviewDto, @Req() req: any) {
    try {
      const userId = req.user?.userId;
      const review = await this.reviewService.create(createReviewDto, userId);
      return review;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get all reviews (with optional search query)' })
  @Get()
  async findAll(@Query('q') searchQuery: string | null) {
    try {
      const reviews = await this.reviewService.findAll(searchQuery);
      return reviews;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get a single review by ID' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const review = await this.reviewService.findOne(id);
      return review;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Update a review' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto, @Req() req: any) {
    try {
      const review = await this.reviewService.update(id, updateReviewDto);
      return review;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Delete a review' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const review = await this.reviewService.remove(id);
      return review;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
