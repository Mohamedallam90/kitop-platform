import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MarketPricingController } from './market-pricing.controller';
import { MarketPricingService } from './market-pricing.service';
import { MarketRate } from './entities/market-rate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketRate]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    ConfigModule,
  ],
  controllers: [MarketPricingController],
  providers: [MarketPricingService],
  exports: [MarketPricingService],
})
export class MarketPricingModule {}