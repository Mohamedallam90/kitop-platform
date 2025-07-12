import { Module } from '@nestjs/common';
import { MarketPricingService } from './market-pricing.service';
import { MarketPricingController } from './market-pricing.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [MarketPricingController],
  providers: [MarketPricingService],
  exports: [MarketPricingService],
})
export class MarketPricingModule {}