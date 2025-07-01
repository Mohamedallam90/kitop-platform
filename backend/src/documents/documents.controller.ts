import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create document' })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  create(@Body() createDocumentDto: CreateDocumentDto) {
    return this.documentsService.create(createDocumentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  findAll(@Request() req, @Query('type') type?: string) {
    const userId = req.user.id;
    if (type) {
      return this.documentsService.findByType(userId, type);
    }
    return this.documentsService.findAll(userId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get document templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  findTemplates() {
    return this.documentsService.findTemplates();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search documents' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  searchDocuments(@Request() req, @Query('q') query: string) {
    return this.documentsService.searchDocuments(req.user.id, query);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate document with AI' })
  @ApiResponse({ status: 201, description: 'Document generated successfully' })
  generateDocument(
    @Request() req,
    @Body() body: { type: string; data: any }
  ) {
    return this.documentsService.generateDocument(req.user.id, body.type, body.data);
  }

  @Post('from-template/:templateId')
  @ApiOperation({ summary: 'Create document from template' })
  @ApiResponse({ status: 201, description: 'Document created from template successfully' })
  createFromTemplate(
    @Request() req,
    @Param('templateId') templateId: string,
    @Body() body: { name: string }
  ) {
    return this.documentsService.createFromTemplate(templateId, req.user.id, body.name);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.documentsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  update(@Param('id') id: string, @Request() req, @Body() updateDocumentDto: UpdateDocumentDto) {
    return this.documentsService.update(id, req.user.id, updateDocumentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.documentsService.remove(id, req.user.id);
  }
}