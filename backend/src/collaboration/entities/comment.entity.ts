import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('comments')
@Index(['documentId', 'clauseIdentifier'])
@Index(['documentId', 'parentCommentId'])
@Index(['status'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  documentId: string;

  @Column({ type: 'varchar', length: 255 })
  clauseIdentifier: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'uuid' })
  authorId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ type: 'uuid', nullable: true })
  parentCommentId?: string;

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment?: Comment;

  @Column({ 
    type: 'enum',
    enum: ['active', 'resolved', 'deleted'],
    default: 'active'
  })
  status: 'active' | 'resolved' | 'deleted';

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    position?: {
      x: number;
      y: number;
      page: number;
    };
    selection?: {
      start: number;
      end: number;
      text: string;
    };
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
  };

  @Column({ type: 'boolean', default: false })
  isOffline: boolean;

  @Column({ 
    type: 'enum',
    enum: ['pending', 'synced', 'error'],
    default: 'synced'
  })
  syncStatus: 'pending' | 'synced' | 'error';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  resolvedBy?: string;
}