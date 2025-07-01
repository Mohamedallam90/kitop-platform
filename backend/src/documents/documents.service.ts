import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {}

  async create(createDocumentDto: CreateDocumentDto): Promise<Document> {
    const document = this.documentRepository.create(createDocumentDto);
    return this.documentRepository.save(document);
  }

  async findAll(userId: string): Promise<Document[]> {
    return this.documentRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, userId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async update(id: string, userId: string, updateDocumentDto: UpdateDocumentDto): Promise<Document> {
    const document = await this.findOne(id, userId);
    
    Object.assign(document, updateDocumentDto);
    return this.documentRepository.save(document);
  }

  async remove(id: string, userId: string): Promise<void> {
    const document = await this.findOne(id, userId);
    await this.documentRepository.remove(document);
  }

  async findByType(userId: string, type: string): Promise<Document[]> {
    return this.documentRepository.find({
      where: { userId, type },
      order: { updatedAt: 'DESC' },
    });
  }

  async findTemplates(): Promise<Document[]> {
    return this.documentRepository.find({
      where: { isTemplate: true },
      order: { name: 'ASC' },
    });
  }

  async createFromTemplate(templateId: string, userId: string, name: string): Promise<Document> {
    const template = await this.documentRepository.findOne({
      where: { id: templateId, isTemplate: true },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const document = this.documentRepository.create({
      userId,
      name,
      type: template.type,
      content: template.content,
      templateId,
      status: 'draft',
      metadata: template.metadata,
    });

    return this.documentRepository.save(document);
  }

  async generateDocument(userId: string, type: string, data: any): Promise<Document> {
    // AI-powered document generation logic would go here
    // For now, we'll create a basic document
    
    const templates = {
      contract: 'This is a contract template with placeholder data.',
      invoice: 'Invoice template with billing information.',
      proposal: 'Project proposal template with scope and pricing.',
    };

    const content = templates[type] || 'Generic document template.';

    const document = this.documentRepository.create({
      userId,
      name: `Generated ${type}`,
      type,
      content,
      status: 'draft',
      metadata: data,
    });

    return this.documentRepository.save(document);
  }

  async searchDocuments(userId: string, query: string): Promise<Document[]> {
    return this.documentRepository
      .createQueryBuilder('document')
      .where('document.userId = :userId', { userId })
      .andWhere(
        '(document.name ILIKE :query OR document.content ILIKE :query OR document.tags::text ILIKE :query)',
        { query: `%${query}%` }
      )
      .orderBy('document.updatedAt', 'DESC')
      .getMany();
  }
}