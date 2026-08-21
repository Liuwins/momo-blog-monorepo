import { Controller, Post, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { LikesService } from './likes.service';
import { PositiveIntPipe } from '../../common/pipes/positive-int.pipe';
import { LikeQueryDto } from './dto';

@Controller('posts')
export class LikesController {
  constructor(private likesService: LikesService) {}

  @Post(':id/like')
  @UseGuards(OptionalJwtAuthGuard)
  toggle(@Param('id', PositiveIntPipe) postId: number, @Request() req, @Query() query: LikeQueryDto) {
    return this.likesService.toggle(postId, req.user?.id, query.visitorId);
  }

  @Get(':id/like-status')
  @UseGuards(OptionalJwtAuthGuard)
  getStatus(@Param('id', PositiveIntPipe) postId: number, @Request() req, @Query() query: LikeQueryDto) {
    return this.likesService.getStatus(postId, req.user?.id, query.visitorId);
  }
}
