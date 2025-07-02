import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('user')
  async getUserMetrics(@Request() req) {
    return this.analyticsService.getUserMetrics(req.user.id);
  }

  @Get('system')
  async getSystemMetrics() {
    return this.analyticsService.getSystemMetrics();
  }

  @Get('usage')
  async getUsageMetrics(@Query('period') period: 'day' | 'week' | 'month', @Request() req) {
    return this.analyticsService.getUsageMetrics(req.user.id, period);
  }
}
