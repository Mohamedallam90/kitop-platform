import { Controller, Post, Get, Body, Param, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SignatureService, SignatureRequest } from './signature.service';

@ApiTags('signature')
@Controller('signature')
export class SignatureController {
  constructor(private readonly signatureService: SignatureService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send document for signature' })
  @ApiResponse({ status: 201, description: 'Document sent for signature successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async sendForSignature(@Body() request: SignatureRequest) {
    try {
      return await this.signatureService.sendForSignature(request);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('status/:envelopeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get signature envelope status' })
  @ApiResponse({ status: 200, description: 'Envelope status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Envelope not found' })
  async getEnvelopeStatus(@Param('envelopeId') envelopeId: string) {
    try {
      return await this.signatureService.getEnvelopeStatus(envelopeId);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('void/:envelopeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Void/cancel a signature envelope' })
  @ApiResponse({ status: 200, description: 'Envelope voided successfully' })
  @ApiResponse({ status: 404, description: 'Envelope not found' })
  async voidEnvelope(
    @Param('envelopeId') envelopeId: string,
    @Body() body: { reason: string }
  ) {
    try {
      await this.signatureService.voidEnvelope(envelopeId, body.reason);
      return { success: true, message: 'Envelope voided successfully' };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('download/:envelopeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download signed document' })
  @ApiResponse({ status: 200, description: 'Document downloaded successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async downloadSignedDocument(@Param('envelopeId') envelopeId: string) {
    try {
      return await this.signatureService.downloadSignedDocument(envelopeId);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('embedded-url/:envelopeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get embedded signing URL' })
  @ApiResponse({ status: 200, description: 'Embedded signing URL retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Envelope not found' })
  async getEmbeddedSigningUrl(
    @Param('envelopeId') envelopeId: string,
    @Query('email') signerEmail: string
  ) {
    try {
      const url = await this.signatureService.getEmbeddedSigningUrl(envelopeId, signerEmail);
      return { url };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('webhook')
  @ApiOperation({ summary: 'DocuSign webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() webhookData: any) {
    try {
      await this.signatureService.handleWebhook(webhookData);
      return { success: true };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}