import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignatureEnvelope } from './entities/signature-envelope.entity';

export interface SignatureRequest {
  documentId: string;
  documentTitle: string;
  documentContent: string; // Base64 encoded document
  signers: SignerInfo[];
  customFields?: Record<string, string>;
  emailSettings?: {
    subject?: string;
    message?: string;
  };
}

export interface SignerInfo {
  name: string;
  email: string;
  role: 'signer' | 'carbon_copy' | 'certified_delivery';
  order?: number;
  tabs?: SignerTab[];
}

export interface SignerTab {
  type: 'sign_here' | 'date_signed' | 'text' | 'checkbox' | 'initial_here';
  label?: string;
  value?: string;
  pageNumber: number;
  xPosition: number;
  yPosition: number;
  width?: number;
  height?: number;
  required?: boolean;
}

export interface SignatureResponse {
  envelopeId: string;
  status: 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided';
  signingUrl?: string;
  embeddedSigningUrl?: string;
  statusChangeUrl?: string;
  expirationDate?: Date;
  createdAt: Date;
}

export interface WebhookData {
  envelopeId: string;
  status: string;
  event: string;
  signerInfo?: {
    email: string;
    name: string;
    status: string;
    signedAt?: Date;
    ipAddress?: string;
  };
  documentInfo?: {
    documentId: string;
    name: string;
    pages: number;
  };
}

@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);
  private readonly baseUrl: string;
  private readonly accountId: string;
  private readonly integrationKey: string;
  private readonly secretKey: string;
  private readonly webhookUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SignatureEnvelope)
    private readonly envelopeRepository: Repository<SignatureEnvelope>,
  ) {
    // DocuSign Configuration
    this.baseUrl = this.configService.get('DOCUSIGN_BASE_URL') || 'https://demo.docusign.net';
    this.accountId = this.configService.get('DOCUSIGN_ACCOUNT_ID');
    this.integrationKey = this.configService.get('DOCUSIGN_INTEGRATION_KEY');
    this.secretKey = this.configService.get('DOCUSIGN_SECRET_KEY');
    this.webhookUrl = this.configService.get('DOCUSIGN_WEBHOOK_URL') || `${this.configService.get('APP_URL')}/api/webhooks/docusign`;
  }

  /**
   * Send document for signature
   */
  async sendForSignature(request: SignatureRequest): Promise<SignatureResponse> {
    try {
      this.logger.log(`Sending document ${request.documentId} for signature`);

      // Get DocuSign access token
      const accessToken = await this.getAccessToken();

      // Create envelope definition
      const envelopeDefinition = this.buildEnvelopeDefinition(request);

      // Send to DocuSign
      const envelopeResponse = await this.createEnvelope(accessToken, envelopeDefinition);

      // Store envelope info in database
      const envelope = await this.storeEnvelope(request, envelopeResponse);

      // Get signing URLs for signers
      const signingUrls = await this.getSigningUrls(accessToken, envelopeResponse.envelopeId, request.signers);

      return {
        envelopeId: envelopeResponse.envelopeId,
        status: 'sent',
        signingUrl: signingUrls.length > 0 ? signingUrls[0].signingUrl : undefined,
        embeddedSigningUrl: signingUrls.length > 0 ? signingUrls[0].embeddedUrl : undefined,
        statusChangeUrl: this.webhookUrl,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to send document for signature: ${error.message}`);
      throw new BadRequestException(`Signature request failed: ${error.message}`);
    }
  }

  /**
   * Get envelope status
   */
  async getEnvelopeStatus(envelopeId: string): Promise<{
    status: string;
    signers: Array<{
      name: string;
      email: string;
      status: string;
      signedAt?: Date;
    }>;
    documents: Array<{
      documentId: string;
      name: string;
      status: string;
    }>;
    lastModified: Date;
  }> {
    try {
      // Check local database first
      const localEnvelope = await this.envelopeRepository.findOne({
        where: { envelopeId },
      });

      if (!localEnvelope) {
        throw new NotFoundException('Envelope not found');
      }

      // If using DocuSign API
      if (this.isDocuSignConfigured()) {
        const accessToken = await this.getAccessToken();
        const status = await this.fetchEnvelopeStatusFromDocuSign(accessToken, envelopeId);
        
        // Update local database
        await this.updateEnvelopeStatus(envelopeId, status);
        
        return status;
      }

      // Return simulated status for development
      return this.getSimulatedStatus(localEnvelope);
    } catch (error) {
      this.logger.error(`Failed to get envelope status: ${error.message}`);
      throw new BadRequestException(`Status check failed: ${error.message}`);
    }
  }

  /**
   * Handle DocuSign webhook events
   */
  async handleWebhook(webhookData: WebhookData): Promise<void> {
    try {
      this.logger.log(`Processing webhook for envelope ${webhookData.envelopeId}`);

      // Update envelope status in database
      await this.envelopeRepository.update(
        { envelopeId: webhookData.envelopeId },
        {
          status: webhookData.status as any,
          lastUpdated: new Date(),
          webhookData: JSON.stringify(webhookData),
        }
      );

      // Trigger additional actions based on status
      await this.processStatusChange(webhookData);

      this.logger.log(`Webhook processed successfully for envelope ${webhookData.envelopeId}`);
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download signed document
   */
  async downloadSignedDocument(envelopeId: string, documentId?: string): Promise<{
    content: Buffer;
    filename: string;
    mimeType: string;
  }> {
    try {
      if (this.isDocuSignConfigured()) {
        const accessToken = await this.getAccessToken();
        return await this.downloadFromDocuSign(accessToken, envelopeId, documentId);
      }

      // Return simulated document for development
      return this.getSimulatedDocument(envelopeId);
    } catch (error) {
      this.logger.error(`Failed to download document: ${error.message}`);
      throw new BadRequestException(`Document download failed: ${error.message}`);
    }
  }

  /**
   * Cancel/Void envelope
   */
  async voidEnvelope(envelopeId: string, reason: string): Promise<void> {
    try {
      if (this.isDocuSignConfigured()) {
        const accessToken = await this.getAccessToken();
        await this.voidEnvelopeInDocuSign(accessToken, envelopeId, reason);
      }

      // Update local status
      await this.envelopeRepository.update(
        { envelopeId },
        {
          status: 'voided',
          voidReason: reason,
          lastUpdated: new Date(),
        }
      );

      this.logger.log(`Envelope ${envelopeId} voided successfully`);
    } catch (error) {
      this.logger.error(`Failed to void envelope: ${error.message}`);
      throw new BadRequestException(`Void operation failed: ${error.message}`);
    }
  }

  /**
   * Get signing URL for embedded signing
   */
  async getEmbeddedSigningUrl(envelopeId: string, signerEmail: string): Promise<string> {
    try {
      if (this.isDocuSignConfigured()) {
        const accessToken = await this.getAccessToken();
        return await this.createEmbeddedSigningUrl(accessToken, envelopeId, signerEmail);
      }

      // Return simulated URL for development
      return `${this.configService.get('APP_URL')}/sign/${envelopeId}?signer=${encodeURIComponent(signerEmail)}`;
    } catch (error) {
      this.logger.error(`Failed to get embedded signing URL: ${error.message}`);
      throw new BadRequestException(`Embedded signing URL creation failed: ${error.message}`);
    }
  }

  /**
   * Private helper methods
   */

  private async getAccessToken(): Promise<string> {
    if (!this.isDocuSignConfigured()) {
      throw new Error('DocuSign not configured');
    }

    try {
      // JWT Grant authentication
      const jwtToken = this.generateJWT();
      
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwtToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`DocuSign authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      this.logger.error(`DocuSign authentication failed: ${error.message}`);
      throw error;
    }
  }

  private generateJWT(): string {
    // In a real implementation, use a proper JWT library
    // This is a simplified version for demonstration
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const payload = {
      iss: this.integrationKey,
      sub: this.accountId,
      aud: this.baseUrl,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      scope: 'signature impersonation',
    };

    // In production, properly sign with RSA private key
    return `${Buffer.from(JSON.stringify(header)).toString('base64')}.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
  }

  private buildEnvelopeDefinition(request: SignatureRequest): any {
    return {
      emailSubject: request.emailSettings?.subject || `Please sign: ${request.documentTitle}`,
      emailBlurb: request.emailSettings?.message || 'Please review and sign the attached document.',
      documents: [{
        documentId: '1',
        name: request.documentTitle,
        documentBase64: request.documentContent,
        fileExtension: 'pdf',
      }],
      recipients: {
        signers: request.signers.map((signer, index) => ({
          email: signer.email,
          name: signer.name,
          recipientId: (index + 1).toString(),
          routingOrder: signer.order || (index + 1),
          tabs: this.buildSignerTabs(signer.tabs || []),
        })),
      },
      status: 'sent',
      eventNotification: {
        url: this.webhookUrl,
        requireAcknowledgment: true,
        useSoapInterface: false,
        includeCertificateWithSoap: false,
        signMessageWithX509Cert: false,
        includeDocuments: false,
        includeEnvelopeVoidReason: true,
        includeTimeZone: true,
        includeSenderAccountAsCustomField: true,
        includeDocumentFields: false,
        includeCertificateOfCompletion: false,
        envelopeEvents: [
          { envelopeEventStatusCode: 'sent' },
          { envelopeEventStatusCode: 'delivered' },
          { envelopeEventStatusCode: 'completed' },
          { envelopeEventStatusCode: 'declined' },
          { envelopeEventStatusCode: 'voided' },
        ],
        recipientEvents: [
          { recipientEventStatusCode: 'sent' },
          { recipientEventStatusCode: 'delivered' },
          { recipientEventStatusCode: 'completed' },
          { recipientEventStatusCode: 'declined' },
          { recipientEventStatusCode: 'authentication_failed' },
          { recipientEventStatusCode: 'autoresponded' },
        ],
      },
    };
  }

  private buildSignerTabs(tabs: SignerTab[]): any {
    const groupedTabs: any = {};

    tabs.forEach(tab => {
      const tabType = this.mapTabType(tab.type);
      if (!groupedTabs[tabType]) {
        groupedTabs[tabType] = [];
      }

      groupedTabs[tabType].push({
        documentId: '1',
        pageNumber: tab.pageNumber,
        xPosition: tab.xPosition,
        yPosition: tab.yPosition,
        width: tab.width || 100,
        height: tab.height || 20,
        required: tab.required !== false,
        tabLabel: tab.label,
        value: tab.value,
      });
    });

    return groupedTabs;
  }

  private mapTabType(type: string): string {
    const mapping = {
      'sign_here': 'signHereTabs',
      'date_signed': 'dateSignedTabs',
      'text': 'textTabs',
      'checkbox': 'checkboxTabs',
      'initial_here': 'initialHereTabs',
    };
    return mapping[type] || 'signHereTabs';
  }

  private async createEnvelope(accessToken: string, envelopeDefinition: any): Promise<{ envelopeId: string }> {
    const response = await fetch(`${this.baseUrl}/restapi/v2.1/accounts/${this.accountId}/envelopes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelopeDefinition),
    });

    if (!response.ok) {
      throw new Error(`Envelope creation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async storeEnvelope(request: SignatureRequest, envelopeResponse: any): Promise<SignatureEnvelope> {
    const envelope = this.envelopeRepository.create({
      envelopeId: envelopeResponse.envelopeId,
      documentId: request.documentId,
      documentTitle: request.documentTitle,
      status: 'sent',
      signers: request.signers,
      createdAt: new Date(),
      lastUpdated: new Date(),
    });

    return await this.envelopeRepository.save(envelope);
  }

  private async getSigningUrls(accessToken: string, envelopeId: string, signers: SignerInfo[]): Promise<Array<{
    signerEmail: string;
    signingUrl: string;
    embeddedUrl: string;
  }>> {
    // Implementation would make API calls to get signing URLs
    // Returning simulated URLs for now
    return signers.map(signer => ({
      signerEmail: signer.email,
      signingUrl: `${this.baseUrl}/signing/${envelopeId}?signer=${encodeURIComponent(signer.email)}`,
      embeddedUrl: `${this.configService.get('APP_URL')}/sign/${envelopeId}?signer=${encodeURIComponent(signer.email)}`,
    }));
  }

  private async fetchEnvelopeStatusFromDocuSign(accessToken: string, envelopeId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Status fetch failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async updateEnvelopeStatus(envelopeId: string, status: any): Promise<void> {
    await this.envelopeRepository.update(
      { envelopeId },
      {
        status: status.status,
        lastUpdated: new Date(),
        docusignData: status,
      }
    );
  }

  private async processStatusChange(webhookData: WebhookData): Promise<void> {
    // Implement business logic for different status changes
    switch (webhookData.status) {
      case 'completed':
        this.logger.log(`Envelope ${webhookData.envelopeId} completed - all signatures collected`);
        // Trigger completion workflow (e.g., notify project manager, update project status)
        break;
      case 'declined':
        this.logger.log(`Envelope ${webhookData.envelopeId} declined by signer`);
        // Handle decline scenario
        break;
      case 'voided':
        this.logger.log(`Envelope ${webhookData.envelopeId} was voided`);
        // Handle void scenario
        break;
    }
  }

  private async downloadFromDocuSign(accessToken: string, envelopeId: string, documentId?: string): Promise<{
    content: Buffer;
    filename: string;
    mimeType: string;
  }> {
    const docId = documentId || 'combined';
    const response = await fetch(
      `${this.baseUrl}/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/documents/${docId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Document download failed: ${response.statusText}`);
    }

    const content = Buffer.from(await response.arrayBuffer());
    return {
      content,
      filename: `signed-document-${envelopeId}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  private async voidEnvelopeInDocuSign(accessToken: string, envelopeId: string, reason: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'voided',
          voidedReason: reason,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Envelope void failed: ${response.statusText}`);
    }
  }

  private async createEmbeddedSigningUrl(accessToken: string, envelopeId: string, signerEmail: string): Promise<string> {
    // Get recipient info
    const recipientResponse = await fetch(
      `${this.baseUrl}/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/recipients`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const recipients = await recipientResponse.json();
    const signer = recipients.signers?.find((s: any) => s.email === signerEmail);

    if (!signer) {
      throw new Error('Signer not found');
    }

    // Create embedded signing URL
    const urlResponse = await fetch(
      `${this.baseUrl}/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/views/recipient`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: signer.name,
          email: signer.email,
          recipientId: signer.recipientId,
          clientUserId: signer.clientUserId || signer.recipientId,
          authenticationMethod: 'none',
          returnUrl: `${this.configService.get('APP_URL')}/sign/complete`,
        }),
      }
    );

    if (!urlResponse.ok) {
      throw new Error(`Embedded URL creation failed: ${urlResponse.statusText}`);
    }

    const urlData = await urlResponse.json();
    return urlData.url;
  }

  private isDocuSignConfigured(): boolean {
    return !!(this.accountId && this.integrationKey && this.secretKey);
  }

  private getSimulatedStatus(envelope: SignatureEnvelope): any {
    return {
      status: envelope.status,
      signers: envelope.signers.map(signer => ({
        name: signer.name,
        email: signer.email,
        status: envelope.status === 'completed' ? 'signed' : 'sent',
        signedAt: envelope.status === 'completed' ? new Date() : undefined,
      })),
      documents: [{
        documentId: envelope.documentId,
        name: envelope.documentTitle,
        status: envelope.status,
      }],
      lastModified: envelope.lastUpdated,
    };
  }

  private getSimulatedDocument(envelopeId: string): {
    content: Buffer;
    filename: string;
    mimeType: string;
  } {
    // Return a simple PDF placeholder
    const pdfContent = `%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n177\n%%EOF`;
    
    return {
      content: Buffer.from(pdfContent),
      filename: `signed-document-${envelopeId}.pdf`,
      mimeType: 'application/pdf',
    };
  }
}