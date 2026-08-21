import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto, QueryPostsDto } from './dto';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Query() query: QueryPostsDto, @Request() req) {
    return this.postsService.findAll(query, req.user?.id);
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard)
  async getHistory(@Param('id') id: number, @Request() req) {
    const history = await this.postsService.getHistory(id, req.user.id);
    if (!history) throw new NotFoundException('文章不存在或无权查看历史');
    return history;
  }

  @Post(':id/history/:revisionId/restore')
  @UseGuards(JwtAuthGuard)
  async restoreHistory(
    @Param('id') id: number,
    @Param('revisionId') revisionId: number,
    @Request() req,
  ) {
    const result = await this.postsService.restoreRevision(id, revisionId, req.user.id);
    if (!result) throw new NotFoundException('历史版本不存在或无权恢复');
    return result;
  }

  @Get('tags')
  getTags(@Query('period') period?: string) {
    return this.postsService.getAllTags(period === 'week' ? 'week' : 'all');
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('id') id: number, @Request() req) {
    const post = await this.postsService.findById(id, req.user?.id);
    if (!post) throw new NotFoundException('文章不存在');
    return post;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: number, @Request() req, @Body() dto: UpdatePostDto) {
    const result = await this.postsService.update(id, req.user.id, dto);
    if (!result) throw new NotFoundException('文章不存在或无权操作');
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: number, @Request() req) {
    const result = await this.postsService.delete(id, req.user.id);
    if (!result) throw new NotFoundException('文章不存在或无权操作');
    return { success: true };
  }
}
