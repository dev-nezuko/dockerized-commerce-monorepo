import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'lead' })
@Index('idx_lead_email', ['email'])
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 320 })
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
