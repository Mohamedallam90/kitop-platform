import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1704067200000 implements MigrationInterface {
  name = 'InitialSchema1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar UNIQUE NOT NULL,
        "password" varchar NOT NULL,
        "firstName" varchar NOT NULL,
        "lastName" varchar NOT NULL,
        "company" varchar,
        "role" varchar DEFAULT 'user',
        "isActive" boolean DEFAULT true,
        "avatar" varchar,
        "phone" varchar,
        "timezone" varchar,
        "preferences" json,
        "lastLoginAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Projects table
    await queryRunner.query(`
      CREATE TYPE "project_status_enum" AS ENUM ('active', 'completed', 'on_hold', 'cancelled');
      
      CREATE TABLE "projects" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "status" "project_status_enum" DEFAULT 'active',
        "startDate" date,
        "endDate" date,
        "budget" decimal(10,2),
        "metadata" jsonb,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_projects_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Documents table
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "name" varchar NOT NULL,
        "type" varchar NOT NULL,
        "status" varchar NOT NULL,
        "content" text NOT NULL,
        "templateId" uuid,
        "metadata" json,
        "fileUrl" varchar,
        "fileSize" integer,
        "mimeType" varchar,
        "isTemplate" boolean DEFAULT false,
        "parentDocumentId" uuid,
        "tags" json,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_documents_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Workflow status enum
    await queryRunner.query(`
      CREATE TYPE "workflow_status_enum" AS ENUM ('draft', 'active', 'paused', 'completed', 'failed');
      CREATE TYPE "workflow_trigger_type_enum" AS ENUM ('manual', 'schedule', 'webhook', 'event');
      
      CREATE TABLE "workflows" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "status" "workflow_status_enum" DEFAULT 'draft',
        "triggerType" "workflow_trigger_type_enum" DEFAULT 'manual',
        "triggerConfig" jsonb,
        "steps" jsonb,
        "variables" jsonb,
        "executionCount" integer DEFAULT 0,
        "lastExecutedAt" TIMESTAMP,
        "nextExecutionAt" TIMESTAMP,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_workflows_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Payments table
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "stripePaymentIntentId" varchar NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "currency" varchar NOT NULL,
        "status" varchar NOT NULL,
        "description" varchar NOT NULL,
        "metadata" jsonb,
        "receiptUrl" varchar,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_payments_user" FOREIGN KEY ("userId") REFERENCES "users"("id")
      )
    `);

    // Subscriptions table
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "stripeSubscriptionId" varchar NOT NULL,
        "stripeCustomerId" varchar NOT NULL,
        "status" varchar NOT NULL,
        "planId" varchar NOT NULL,
        "planName" varchar NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "currency" varchar NOT NULL,
        "interval" varchar NOT NULL,
        "currentPeriodStart" TIMESTAMP NOT NULL,
        "currentPeriodEnd" TIMESTAMP NOT NULL,
        "canceledAt" TIMESTAMP,
        "cancelAtPeriodEnd" boolean,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_subscriptions_user" FOREIGN KEY ("userId") REFERENCES "users"("id")
      )
    `);

    // Comments table for collaboration
    await queryRunner.query(`
      CREATE TABLE "comments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "documentId" varchar(255) NOT NULL,
        "clauseIdentifier" varchar(255) NOT NULL,
        "content" text NOT NULL,
        "authorId" uuid NOT NULL,
        "parentCommentId" uuid,
        "status" varchar NOT NULL DEFAULT 'active',
        "metadata" jsonb,
        "isOffline" boolean DEFAULT false,
        "syncStatus" varchar NOT NULL DEFAULT 'synced',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "resolvedAt" TIMESTAMP,
        "resolvedBy" uuid,
        CONSTRAINT "fk_comments_author" FOREIGN KEY ("authorId") REFERENCES "users"("id"),
        CONSTRAINT "fk_comments_parent" FOREIGN KEY ("parentCommentId") REFERENCES "comments"("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_documents_userId" ON "documents" ("userId");
      CREATE INDEX "idx_documents_type" ON "documents" ("type");
      CREATE INDEX "idx_documents_status" ON "documents" ("status");
      CREATE INDEX "idx_documents_isTemplate" ON "documents" ("isTemplate");
      
      CREATE INDEX "idx_projects_userId" ON "projects" ("userId");
      CREATE INDEX "idx_projects_status" ON "projects" ("status");
      
      CREATE INDEX "idx_workflows_userId" ON "workflows" ("userId");
      CREATE INDEX "idx_workflows_status" ON "workflows" ("status");
      
      CREATE INDEX "idx_payments_userId" ON "payments" ("userId");
      CREATE INDEX "idx_payments_status" ON "payments" ("status");
      
      CREATE INDEX "idx_subscriptions_userId" ON "subscriptions" ("userId");
      CREATE INDEX "idx_subscriptions_status" ON "subscriptions" ("status");
      
      CREATE INDEX "idx_comments_documentId_clauseIdentifier" ON "comments" ("documentId", "clauseIdentifier");
      CREATE INDEX "idx_comments_documentId_parentCommentId" ON "comments" ("documentId", "parentCommentId");
      CREATE INDEX "idx_comments_status" ON "comments" ("status");
    `);

    // Signature envelopes table
    await queryRunner.query(`
      CREATE TABLE "signature_envelopes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "envelopeId" varchar(255) UNIQUE NOT NULL,
        "documentId" varchar(255) NOT NULL,
        "documentTitle" varchar(500) NOT NULL,
        "status" varchar NOT NULL DEFAULT 'created',
        "signers" jsonb NOT NULL,
        "voidReason" varchar(1000),
        "webhookData" jsonb,
        "docusignData" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastUpdated" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_signature_envelopes_envelopeId" ON "signature_envelopes" ("envelopeId");
      CREATE INDEX "idx_signature_envelopes_documentId" ON "signature_envelopes" ("documentId");
      CREATE INDEX "idx_signature_envelopes_status" ON "signature_envelopes" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "signature_envelopes"`);
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "workflows"`);
    await queryRunner.query(`DROP TYPE "workflow_trigger_type_enum"`);
    await queryRunner.query(`DROP TYPE "workflow_status_enum"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TYPE "project_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}