import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SignatureService } from './signature.service';
import { SignatureController } from './signature.controller';
import { SignatureEnvelope } from './entities/signature-envelope.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SignatureEnvelope]),
    ConfigModule,
  ],
  controllers: [SignatureController],
  providers: [SignatureService],
  exports: [SignatureService],
})
export class SignatureModule {}