import { Controller, Get, Post, Query, Request, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { NotificationsService } from './notifications.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PositiveIntPipe } from '../../common/pipes/positive-int.pipe';

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

  @Post(':id/read')
  async markOneAsRead(@Param('id', PositiveIntPipe) id: number, @Request() req) {
    const count = await this.notificationsService.markOneAsRead(req.user.id, id);
    return { count };
  }
}
