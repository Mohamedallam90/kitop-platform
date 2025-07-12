import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIService } from './ai/openai.service';
import { LawGeexService } from './ai/lawgeex.service';
import { AIController } from './ai/ai.controller';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 10,  // 10 requests per minute for AI endpoints
    }]),
  ],
  controllers: [AIController],
  providers: [OpenAIService, LawGeexService],
  exports: [OpenAIService, LawGeexService],
})
export class IntegrationsModule {}
