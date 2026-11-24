import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { DataSource } from 'typeorm';
import { DatabaseStatus, HealthChecker, HealthStatus } from '../../application/port/health-checker';

@Injectable()
export class HealthCheckerAdapter extends HealthChecker {
  private readonly logger = new Logger(HealthCheckerAdapter.name);

  constructor(
    private readonly postgres: DataSource,
    @InjectConnection() private readonly mongo: Connection,
  ) {
    super();
  }

  async check(): Promise<HealthStatus> {
    const [postgres, mongodb] = await Promise.all([this.checkPostgres(), this.checkMongo()]);
    return { postgres, mongodb };
  }

  private async checkPostgres(): Promise<DatabaseStatus> {
    try {
      await this.postgres.query('SELECT 1');
      return 'ok';
    } catch (error) {
      this.logger.error(`PostgreSQL is not responding: ${(error as Error).message}`);
      return 'error';
    }
  }

  private async checkMongo(): Promise<DatabaseStatus> {
    try {
      if (!this.mongo.db) {
        throw new Error('connection not established');
      }
      await this.mongo.db.admin().ping();
      return 'ok';
    } catch (error) {
      this.logger.error(`MongoDB is not responding: ${(error as Error).message}`);
      return 'error';
    }
  }
}
