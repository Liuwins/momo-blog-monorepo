import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
// 健康检查跳过限流，便于监控高频探测
@SkipThrottle()
export class HealthController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get()
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
      };
    } catch {
      // 数据库不可用时返回 503，让 Docker/Nginx/监控明确识别服务未就绪。
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: '数据库不可用',
      });
    }
  }
}
