import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'lead' })
@Index('idx_lead_email', ['email'], { unique: true })
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 320, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  utmSource?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
