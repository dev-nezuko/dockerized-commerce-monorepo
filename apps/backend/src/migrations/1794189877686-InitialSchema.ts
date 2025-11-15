import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1794189877686 implements MigrationInterface {
  name = 'InitialSchema1794189877686';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "lead" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(320) NOT NULL,
        "name" character varying(120) NOT NULL,
        "message" text NOT NULL,
        "utmSource" character varying(120),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ca96c1888f7dcfccab72b72fffa" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_lead_email" ON "lead" ("email")
    `);
    await queryRunner.query(`
      CREATE TABLE "product" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" character varying(255) NOT NULL,
        "name" text NOT NULL,
        "priceCents" integer NOT NULL,
        "imageUrl" text NOT NULL,
        "shortDescription" text NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_product_created_price" ON "product" ("createdAt", "priceCents")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_product_name" ON "product" ("name")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_product_slug" ON "product" ("slug")
    `);
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(320) NOT NULL,
        "passwordHash" text NOT NULL,
        "role" character varying(20) NOT NULL DEFAULT 'user',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_user_email" ON "user" ("email")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."idx_user_email"
    `);
    await queryRunner.query(`
      DROP TABLE "user"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."idx_product_slug"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."idx_product_name"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."idx_product_created_price"
    `);
    await queryRunner.query(`
      DROP TABLE "product"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."idx_lead_email"
    `);
    await queryRunner.query(`
      DROP TABLE "lead"
    `);
  }
}
