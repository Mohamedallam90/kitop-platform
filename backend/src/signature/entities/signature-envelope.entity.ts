import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { SignerInfo } from '../signature.service';

@Entity('signature_envelopes')
@Index(['envelopeId'], { unique: true })
@Index(['documentId'])
@Index(['status'])
export class SignatureEnvelope {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  envelopeId: string;

  @Column({ type: 'varchar', length: 255 })
  documentId: string;

  @Column({ type: 'varchar', length: 500 })
  documentTitle: string;

  @Column({ 
    type: 'enum',
    enum: ['created', 'sent', 'delivered', 'signed', 'completed', 'declined', 'voided'],
    default: 'created'
  })
  status: 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided';

  @Column({ type: 'jsonb' })
  signers: SignerInfo[];

  @Column({ type: 'varchar', length: 1000, nullable: true })
  voidReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  webhookData?: any;

  @Column({ type: 'jsonb', nullable: true })
  docusignData?: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastUpdated: Date;
}