import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { FollowsService } from './follows.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PositiveIntPipe } from '../../common/pipes/positive-int.pipe';

@Controller('follows')
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(private followsService: FollowsService) {}

  // 关注某人
  @Post(':userId')
  follow(@Request() req, @Param('userId', PositiveIntPipe) userId: number) {
    return this.followsService.follow(req.user.id, userId);
  }

  // 取消关注
  @Delete(':userId')
  unfollow(@Request() req, @Param('userId', PositiveIntPipe) userId: number) {
    return this.followsService.unfollow(req.user.id, userId);
  }

  // 关注的人的动态流
  @Get('posts')
  followingPosts(@Request() req, @Query() query: PaginationQueryDto) {
    return this.followsService.getFollowingPosts(
      req.user.id,
      query.page ?? 1,
      query.pageSize ?? 10,
    );
  }
}
