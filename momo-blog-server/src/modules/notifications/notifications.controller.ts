import { Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { NotificationsService } from './notifications.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findAll(@Request() req, @Query() query: PaginationQueryDto) {
    return this.notificationsService.findAll(req.user.id, query.page ?? 1, query.pageSize ?? 20);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Post('read-all')
  markAsRead(@Request() req) {
    return this.notificationsService.markAsRead(req.user.id);
  }
}
