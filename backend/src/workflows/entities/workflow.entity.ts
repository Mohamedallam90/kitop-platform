import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum WorkflowTriggerType {
  MANUAL = 'manual',
  SCHEDULE = 'schedule',
  WEBHOOK = 'webhook',
  EVENT = 'event'
}

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT
  })
  status: WorkflowStatus;

  @Column({
    type: 'enum',
    enum: WorkflowTriggerType,
    default: WorkflowTriggerType.MANUAL
  })
  triggerType: WorkflowTriggerType;

  @Column({ type: 'jsonb', nullable: true })
  triggerConfig: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  steps: Record<string, any>[];

  @Column({ type: 'jsonb', nullable: true })
  variables: Record<string, any>;

  @Column({ default: 0 })
  executionCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextExecutionAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}