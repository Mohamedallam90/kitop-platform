import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('market_rates')
@Index(['industry', 'projectType', 'location'], { unique: false })
@Index(['cacheKey'], { unique: false })
export class MarketRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  cacheKey: string;

  @Column({ type: 'varchar', length: 100 })
  industry: string;

  @Column({ type: 'varchar', length: 100 })
  projectType: string;

  @Column({ type: 'varchar', length: 100, default: 'global' })
  location: string;

  @Column({ 
    type: 'enum', 
    enum: ['entry', 'mid', 'senior', 'expert'], 
    default: 'mid' 
  })
  experienceLevel: 'entry' | 'mid' | 'senior' | 'expert';

  @Column({ 
    type: 'enum', 
    enum: ['small', 'medium', 'large', 'enterprise'], 
    default: 'medium' 
  })
  projectSize: 'small' | 'medium' | 'large' | 'enterprise';

  @Column({ type: 'jsonb' })
  rateData: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}