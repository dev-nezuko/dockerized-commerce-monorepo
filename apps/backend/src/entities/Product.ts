import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'product' })
@Index('idx_product_slug', ['slug'], { unique: true })
@Index('idx_product_name', ['name'])
@Index('idx_product_created_price', ['createdAt', 'priceCents'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'integer' })
  priceCents!: number;

  @Column({ type: 'text' })
  imageUrl!: string;

  @Column({ type: 'text' })
  shortDescription!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
