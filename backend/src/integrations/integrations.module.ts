import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIService } from './ai/openai.service';
import { LawGeexService } from './ai/lawgeex.service';
import { AIController } from './ai/ai.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AIController],
  providers: [OpenAIService, LawGeexService],
  exports: [OpenAIService, LawGeexService],
})
export class IntegrationsModule {}