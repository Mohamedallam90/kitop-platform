import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Comment } from './entities/comment.entity';
import { offlineStorage } from '../../frontend/lib/offline-storage';

export interface CreateCommentDto {
  documentId: string;
  clauseIdentifier: string;
  content: string;
  parentCommentId?: string;
  metadata?: {
    position?: { x: number; y: number; page: number };
    selection?: { start: number; end: number; text: string };
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
  };
}

export interface UpdateCommentDto {
  content?: string;
  status?: 'active' | 'resolved' | 'deleted';
  metadata?: any;
}

export interface CommentNotification {
  type: 'comment_added' | 'comment_updated' | 'comment_resolved' | 'comment_deleted';
  documentId: string;
  clauseIdentifier: string;
  comment: Comment;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/collaboration',
})
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  @WebSocketServer()
  server: Server;

  // Track which users are viewing which documents
  private documentViewers = new Map<string, Set<string>>();
  // Track user socket connections
  private userSockets = new Map<string, string>();

  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  /**
   * Create a new comment on a document clause
   */
  async createComment(createCommentDto: CreateCommentDto, authorId: string): Promise<Comment> {
    try {
      this.logger.log(`Creating comment on document ${createCommentDto.documentId} by user ${authorId}`);

      const comment = this.commentRepository.create({
        ...createCommentDto,
        authorId,
        status: 'active',
        syncStatus: 'synced',
      });

      const savedComment = await this.commentRepository.save(comment);

      // Load the full comment with author information
      const fullComment = await this.commentRepository.findOne({
        where: { id: savedComment.id },
        relations: ['author', 'parentComment'],
      });

      // Broadcast to all users viewing this document
      this.broadcastToDocument(createCommentDto.documentId, 'comment_added', {
        type: 'comment_added',
        documentId: createCommentDto.documentId,
        clauseIdentifier: createCommentDto.clauseIdentifier,
        comment: fullComment,
        author: {
          id: fullComment.author.id,
          name: fullComment.author.name,
          email: fullComment.author.email,
        },
      });

      return fullComment;
    } catch (error) {
      this.logger.error(`Failed to create comment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get comments for a specific document
   */
  async getDocumentComments(documentId: string): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { 
        documentId,
        status: 'active' // Only return active comments
      },
      relations: ['author', 'parentComment'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get comments for a specific clause
   */
  async getClauseComments(documentId: string, clauseIdentifier: string): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { 
        documentId,
        clauseIdentifier,
        status: 'active'
      },
      relations: ['author', 'parentComment'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, updateCommentDto: UpdateCommentDto, userId: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user can update this comment
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    // Update the comment
    await this.commentRepository.update(commentId, {
      ...updateCommentDto,
      updatedAt: new Date(),
    });

    const updatedComment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author', 'parentComment'],
    });

    // Broadcast update
    this.broadcastToDocument(comment.documentId, 'comment_updated', {
      type: 'comment_updated',
      documentId: comment.documentId,
      clauseIdentifier: comment.clauseIdentifier,
      comment: updatedComment,
      author: {
        id: updatedComment.author.id,
        name: updatedComment.author.name,
        email: updatedComment.author.email,
      },
    });

    return updatedComment;
  }

  /**
   * Resolve a comment thread
   */
  async resolveComment(commentId: string, userId: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Update comment status
    await this.commentRepository.update(commentId, {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: userId,
      updatedAt: new Date(),
    });

    const resolvedComment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author', 'parentComment'],
    });

    // Broadcast resolution
    this.broadcastToDocument(comment.documentId, 'comment_resolved', {
      type: 'comment_resolved',
      documentId: comment.documentId,
      clauseIdentifier: comment.clauseIdentifier,
      comment: resolvedComment,
      author: {
        id: resolvedComment.author.id,
        name: resolvedComment.author.name,
        email: resolvedComment.author.email,
      },
    });

    return resolvedComment;
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user can delete this comment
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Soft delete
    await this.commentRepository.update(commentId, {
      status: 'deleted',
      updatedAt: new Date(),
    });

    // Broadcast deletion
    this.broadcastToDocument(comment.documentId, 'comment_deleted', {
      type: 'comment_deleted',
      documentId: comment.documentId,
      clauseIdentifier: comment.clauseIdentifier,
      comment: { ...comment, status: 'deleted' },
      author: {
        id: comment.author.id,
        name: comment.author.name,
        email: comment.author.email,
      },
    });
  }

  /**
   * Get comment thread (parent comment with all replies)
   */
  async getCommentThread(parentCommentId: string): Promise<Comment[]> {
    return this.commentRepository.find({
      where: [
        { id: parentCommentId },
        { parentCommentId: parentCommentId }
      ],
      relations: ['author', 'parentComment'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get unresolved comments for a document
   */
  async getUnresolvedComments(documentId: string): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { 
        documentId,
        status: 'active'
      },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * WebSocket Event Handlers
   */

  @SubscribeMessage('join_document')
  async handleJoinDocument(
    @MessageBody() data: { documentId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { documentId, userId } = data;
    
    this.logger.log(`User ${userId} joining document ${documentId}`);
    
    // Add user to document room
    await client.join(`document:${documentId}`);
    
    // Track user viewing this document
    if (!this.documentViewers.has(documentId)) {
      this.documentViewers.set(documentId, new Set());
    }
    this.documentViewers.get(documentId).add(userId);
    this.userSockets.set(userId, client.id);

    // Notify other users
    client.to(`document:${documentId}`).emit('user_joined', {
      userId,
      documentId,
      timestamp: new Date(),
    });

    // Send current document comments to the joining user
    const comments = await this.getDocumentComments(documentId);
    client.emit('document_comments', { documentId, comments });
  }

  @SubscribeMessage('leave_document')
  async handleLeaveDocument(
    @MessageBody() data: { documentId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { documentId, userId } = data;
    
    this.logger.log(`User ${userId} leaving document ${documentId}`);
    
    // Remove user from document room
    await client.leave(`document:${documentId}`);
    
    // Update tracking
    if (this.documentViewers.has(documentId)) {
      this.documentViewers.get(documentId).delete(userId);
      if (this.documentViewers.get(documentId).size === 0) {
        this.documentViewers.delete(documentId);
      }
    }
    this.userSockets.delete(userId);

    // Notify other users
    client.to(`document:${documentId}`).emit('user_left', {
      userId,
      documentId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @MessageBody() data: { documentId: string; clauseIdentifier: string; userId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    client.to(`document:${data.documentId}`).emit('user_typing', {
      userId: data.userId,
      clauseIdentifier: data.clauseIdentifier,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @MessageBody() data: { documentId: string; clauseIdentifier: string; userId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    client.to(`document:${data.documentId}`).emit('user_typing', {
      userId: data.userId,
      clauseIdentifier: data.clauseIdentifier,
      isTyping: false,
    });
  }

  @SubscribeMessage('cursor_position')
  handleCursorPosition(
    @MessageBody() data: { 
      documentId: string; 
      userId: string; 
      position: { x: number; y: number; page: number };
    },
    @ConnectedSocket() client: Socket,
  ): void {
    client.to(`document:${data.documentId}`).emit('cursor_update', {
      userId: data.userId,
      position: data.position,
    });
  }

  @SubscribeMessage('selection_change')
  handleSelectionChange(
    @MessageBody() data: { 
      documentId: string; 
      userId: string; 
      selection: { start: number; end: number; text: string; clauseId: string };
    },
    @ConnectedSocket() client: Socket,
  ): void {
    client.to(`document:${data.documentId}`).emit('selection_update', {
      userId: data.userId,
      selection: data.selection,
    });
  }

  /**
   * Private helper methods
   */

  private broadcastToDocument(documentId: string, event: string, data: any): void {
    this.server.to(`document:${documentId}`).emit(event, data);
  }

  /**
   * Get active viewers for a document
   */
  async getDocumentViewers(documentId: string): Promise<string[]> {
    return Array.from(this.documentViewers.get(documentId) || []);
  }

  /**
   * Check if user is currently viewing document
   */
  isUserViewingDocument(userId: string, documentId: string): boolean {
    return this.documentViewers.get(documentId)?.has(userId) || false;
  }

  /**
   * Sync offline comments when user comes back online
   */
  async syncOfflineComments(userId: string): Promise<void> {
    try {
      this.logger.log(`Syncing offline comments for user ${userId}`);
      
      // This would integrate with the offline storage service
      if (typeof window !== 'undefined') {
        const offlineComments = await offlineStorage.getAllComments();
        const pendingComments = offlineComments.filter(c => c.syncStatus === 'pending');
        
        for (const offlineComment of pendingComments) {
          try {
            await this.createComment({
              documentId: offlineComment.documentId,
              clauseIdentifier: offlineComment.clauseId,
              content: offlineComment.content,
              metadata: {
                priority: 'medium',
                tags: ['offline-sync'],
              },
            }, userId);
            
            // Update offline storage sync status
            await offlineStorage.updateCommentSyncStatus(offlineComment.id, 'synced');
          } catch (error) {
            this.logger.error(`Failed to sync offline comment ${offlineComment.id}: ${error.message}`);
            await offlineStorage.updateCommentSyncStatus(offlineComment.id, 'error');
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to sync offline comments: ${error.message}`);
    }
  }

  /**
   * Get comment statistics for a document
   */
  async getCommentStatistics(documentId: string): Promise<{
    total: number;
    active: number;
    resolved: number;
    byClause: Record<string, number>;
    byAuthor: Record<string, number>;
  }> {
    const comments = await this.commentRepository.find({
      where: { documentId },
      relations: ['author'],
    });

    const stats = {
      total: comments.length,
      active: comments.filter(c => c.status === 'active').length,
      resolved: comments.filter(c => c.status === 'resolved').length,
      byClause: {} as Record<string, number>,
      byAuthor: {} as Record<string, number>,
    };

    comments.forEach(comment => {
      // Count by clause
      stats.byClause[comment.clauseIdentifier] = (stats.byClause[comment.clauseIdentifier] || 0) + 1;
      
      // Count by author
      const authorName = comment.author.name;
      stats.byAuthor[authorName] = (stats.byAuthor[authorName] || 0) + 1;
    });

    return stats;
  }

  /**
   * Handle client disconnect
   */
  async handleDisconnect(client: Socket): Promise<void> {
    // Find user by socket ID and clean up
    const userId = Array.from(this.userSockets.entries())
      .find(([, socketId]) => socketId === client.id)?.[0];
    
    if (userId) {
      this.userSockets.delete(userId);
      
      // Remove from all document viewers
      this.documentViewers.forEach((viewers, documentId) => {
        if (viewers.has(userId)) {
          viewers.delete(userId);
          // Notify other users in the document
          client.to(`document:${documentId}`).emit('user_left', {
            userId,
            documentId,
            timestamp: new Date(),
          });
        }
      });
    }
  }
}