import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

// Import entities
import { User } from '../users/entities/user.entity';
import { Document } from '../documents/entities/document.entity';
import { Workflow } from '../workflows/entities/workflow.entity';
import { Project } from '../projects/entities/project.entity';

async function bootstrap() {
  const logger = new Logger('SeedScript');
  logger.log('Starting database seed...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get repositories
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const documentRepository = app.get<Repository<Document>>(getRepositoryToken(Document));
    const workflowRepository = app.get<Repository<Workflow>>(getRepositoryToken(Workflow));
    const projectRepository = app.get<Repository<Project>>(getRepositoryToken(Project));

    // Clear existing data (optional, comment out if you want to keep existing data)
    logger.log('Clearing existing data...');
    await workflowRepository.delete({});
    await documentRepository.delete({});
    await projectRepository.delete({});
    await userRepository.delete({});

    // Read seed data from JSON files
    const usersData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'seed-data/users.json'), 'utf8'));
    const documentsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'seed-data/documents.json'), 'utf8'));
    const workflowsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'seed-data/workflows.json'), 'utf8'));

    // Seed users
    logger.log('Seeding users...');
    for (const userData of usersData) {
      // Password is already hashed in the seed data, but if it wasn't:
      // const hashedPassword = await bcrypt.hash(userData.password, 12);
      // userData.password = hashedPassword;
      
      await userRepository.save(userData);
    }

    // Seed documents
    logger.log('Seeding documents...');
    for (const documentData of documentsData) {
      await documentRepository.save(documentData);
    }

    // Seed workflows
    logger.log('Seeding workflows...');
    for (const workflowData of workflowsData) {
      await workflowRepository.save(workflowData);
    }

    // Seed projects
    logger.log('Seeding projects...');
    const projectsData = [
      {
        id: 'project-001',
        userId: usersData[0].id,
        name: 'Website Redesign',
        description: 'Complete redesign of client website with new branding',
        status: 'active',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-03-31'),
        budget: 15000,
        metadata: {
          client: 'Acme Corporation',
          priority: 'high',
          team: ['design', 'development']
        }
      },
      {
        id: 'project-002',
        userId: usersData[0].id,
        name: 'Marketing Campaign',
        description: 'Q1 digital marketing campaign for product launch',
        status: 'on_hold',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-04-30'),
        budget: 8000,
        metadata: {
          client: 'TechStart Inc',
          priority: 'medium',
          team: ['marketing', 'content']
        }
      },
      {
        id: 'project-003',
        userId: usersData[2].id,
        name: 'Brand Identity',
        description: 'Complete brand identity package including logo and style guide',
        status: 'active',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-02-28'),
        budget: 5500,
        metadata: {
          client: 'New Horizons',
          priority: 'high',
          team: ['design']
        }
      }
    ];

    for (const projectData of projectsData) {
      await projectRepository.save(projectData);
    }

    logger.log('Seed completed successfully!');
  } catch (error) {
    logger.error('Error during seed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();