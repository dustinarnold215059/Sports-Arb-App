import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/database';
import { EnvManager } from '@/lib/security/env';

export interface BackupConfig {
  schedule: string; // cron expression
  retentionDays: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  backupPath: string;
  maxBackupSize: number; // in MB
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  fileName: string;
  size: number;
  duration: number;
  timestamp: Date;
  error?: string;
}

export interface BackupMetadata {
  id: string;
  fileName: string;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  createdAt: Date;
  tables: string[];
  recordCounts: Record<string, number>;
}

/**
 * Database backup service
 * Handles automated backups, compression, and cleanup
 */
class BackupService {
  private config: BackupConfig;
  private backupHistory: BackupMetadata[] = [];
  private scheduledBackup?: NodeJS.Timeout;

  constructor() {
    this.config = {
      schedule: '0 2 * * *', // Daily at 2 AM
      retentionDays: 30,
      compressionEnabled: true,
      encryptionEnabled: false, // Enable in production with proper key management
      backupPath: path.join(process.cwd(), 'backups'),
      maxBackupSize: 1000 // 1GB
    };
  }

  /**
   * Initialize backup service
   */
  async initialize(): Promise<void> {
    try {
      // Ensure backup directory exists
      await this.ensureBackupDirectory();
      
      // Load backup history
      await this.loadBackupHistory();
      
      // Schedule automatic backups if enabled
      if (EnvManager.isProduction()) {
        this.scheduleBackups();
      }

      console.log('✅ Backup service initialized');
    } catch (error) {
      console.error('❌ Backup service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a database backup
   */
  async createBackup(options: {
    tables?: string[];
    compress?: boolean;
    encrypt?: boolean;
  } = {}): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`🔄 Starting backup: ${backupId}`);

      // Get tables to backup
      const tablesToBackup = options.tables || await this.getAllTables();
      
      // Create backup data
      const backupData = await this.exportData(tablesToBackup);
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let fileName = `${backupId}_${timestamp}.json`;
      
      // Write backup file
      const filePath = path.join(this.config.backupPath, fileName);
      await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));
      
      let fileSize = (await fs.stat(filePath)).size;
      
      // Compress if enabled
      if (options.compress ?? this.config.compressionEnabled) {
        const compressedPath = await this.compressBackup(filePath);
        if (compressedPath) {
          await fs.unlink(filePath); // Remove uncompressed file
          fileName = path.basename(compressedPath);
          fileSize = (await fs.stat(compressedPath)).size;
        }
      }

      // Encrypt if enabled (placeholder - implement with proper encryption)
      if (options.encrypt ?? this.config.encryptionEnabled) {
        // TODO: Implement encryption
        console.warn('⚠️ Encryption not yet implemented');
      }

      const duration = Date.now() - startTime;
      const result: BackupResult = {
        success: true,
        backupId,
        fileName,
        size: fileSize,
        duration,
        timestamp: new Date()
      };

      // Store backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        fileName,
        size: fileSize,
        compressed: options.compress ?? this.config.compressionEnabled,
        encrypted: options.encrypt ?? this.config.encryptionEnabled,
        createdAt: new Date(),
        tables: tablesToBackup,
        recordCounts: await this.getRecordCounts(tablesToBackup)
      };

      this.backupHistory.push(metadata);
      await this.saveBackupHistory();

      console.log(`✅ Backup completed: ${fileName} (${this.formatFileSize(fileSize)}) in ${duration}ms`);
      
      // Cleanup old backups
      await this.cleanupOldBackups();

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Backup failed: ${error.message}`);
      
      return {
        success: false,
        backupId,
        fileName: '',
        size: 0,
        duration,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupId: string, options: {
    tables?: string[];
    confirmDangerous?: boolean;
  } = {}): Promise<{ success: boolean; error?: string }> {
    try {
      if (!options.confirmDangerous) {
        throw new Error('Restore operation requires confirmDangerous: true');
      }

      console.log(`🔄 Starting restore from backup: ${backupId}`);

      // Find backup metadata
      const backup = this.backupHistory.find(b => b.id === backupId);
      if (!backup) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      // Read backup file
      const filePath = path.join(this.config.backupPath, backup.fileName);
      
      let backupData: any;
      if (backup.compressed) {
        // TODO: Implement decompression
        throw new Error('Compressed backup restore not yet implemented');
      } else {
        const fileContent = await fs.readFile(filePath, 'utf8');
        backupData = JSON.parse(fileContent);
      }

      // Restore data
      await this.importData(backupData, options.tables);

      console.log(`✅ Restore completed from backup: ${backupId}`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Restore failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get backup history
   */
  getBackupHistory(): BackupMetadata[] {
    return [...this.backupHistory].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const backup = this.backupHistory.find(b => b.id === backupId);
      if (!backup) {
        console.warn(`⚠️ Backup not found: ${backupId}`);
        return false;
      }

      // Delete file
      const filePath = path.join(this.config.backupPath, backup.fileName);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn(`⚠️ Failed to delete backup file: ${error.message}`);
      }

      // Remove from history
      const index = this.backupHistory.findIndex(b => b.id === backupId);
      if (index !== -1) {
        this.backupHistory.splice(index, 1);
        await this.saveBackupHistory();
      }

      console.log(`✅ Backup deleted: ${backupId}`);
      return true;

    } catch (error) {
      console.error(`❌ Delete backup failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get backup statistics
   */
  getBackupStats(): any {
    const totalBackups = this.backupHistory.length;
    const totalSize = this.backupHistory.reduce((sum, backup) => sum + backup.size, 0);
    const latestBackup = this.backupHistory.length > 0 
      ? this.backupHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      : null;

    return {
      totalBackups,
      totalSize: this.formatFileSize(totalSize),
      latestBackup: latestBackup ? {
        id: latestBackup.id,
        createdAt: latestBackup.createdAt,
        size: this.formatFileSize(latestBackup.size)
      } : null,
      retentionPeriod: this.config.retentionDays,
      backupPath: this.config.backupPath,
      averageSize: totalBackups > 0 ? this.formatFileSize(totalSize / totalBackups) : '0B'
    };
  }

  /**
   * Update backup configuration
   */
  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('✅ Backup configuration updated');
  }

  /**
   * Private helper: Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.access(this.config.backupPath);
    } catch {
      await fs.mkdir(this.config.backupPath, { recursive: true });
      console.log(`📁 Created backup directory: ${this.config.backupPath}`);
    }
  }

  /**
   * Private helper: Get all table names
   */
  private async getAllTables(): Promise<string[]> {
    // For SQLite, we can query the sqlite_master table
    try {
      const result = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations'
      `;
      return result.map(row => row.name);
    } catch (error) {
      console.warn('⚠️ Failed to get table names, using defaults');
      return ['users', 'bets', 'portfolios', 'user_sessions', 'api_cache', 'system_metrics'];
    }
  }

  /**
   * Private helper: Export data from tables
   */
  private async exportData(tables: string[]): Promise<any> {
    const exportData: any = {
      metadata: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        tables: tables
      },
      data: {}
    };

    for (const table of tables) {
      try {
        const data = await prisma.$queryRawUnsafe(`SELECT * FROM ${table}`);
        exportData.data[table] = data;
        console.log(`📤 Exported ${Array.isArray(data) ? data.length : 0} records from ${table}`);
      } catch (error) {
        console.warn(`⚠️ Failed to export table ${table}: ${error.message}`);
        exportData.data[table] = [];
      }
    }

    return exportData;
  }

  /**
   * Private helper: Import data to tables
   */
  private async importData(backupData: any, tables?: string[]): Promise<void> {
    const tablesToRestore = tables || Object.keys(backupData.data);

    for (const table of tablesToRestore) {
      if (!backupData.data[table]) {
        console.warn(`⚠️ No data found for table: ${table}`);
        continue;
      }

      try {
        // Clear existing data
        await prisma.$queryRawUnsafe(`DELETE FROM ${table}`);
        
        // Insert backup data
        const records = backupData.data[table];
        if (Array.isArray(records) && records.length > 0) {
          // Note: This is a simplified approach - production would need proper data type handling
          for (const record of records) {
            const columns = Object.keys(record).join(', ');
            const placeholders = Object.keys(record).map(() => '?').join(', ');
            const values = Object.values(record);
            
            await prisma.$queryRawUnsafe(
              `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
              ...values
            );
          }
        }
        
        console.log(`📥 Restored ${records.length} records to ${table}`);
      } catch (error) {
        console.error(`❌ Failed to restore table ${table}: ${error.message}`);
      }
    }
  }

  /**
   * Private helper: Get record counts for tables
   */
  private async getRecordCounts(tables: string[]): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    for (const table of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table}`);
        const count = Array.isArray(result) && result[0] ? (result[0] as any).count : 0;
        counts[table] = Number(count);
      } catch (error) {
        counts[table] = 0;
      }
    }

    return counts;
  }

  /**
   * Private helper: Compress backup file
   */
  private async compressBackup(filePath: string): Promise<string | null> {
    try {
      // Simple approach using gzip (if available)
      const compressedPath = `${filePath}.gz`;
      
      // Check if gzip is available
      try {
        execSync(`gzip -c "${filePath}" > "${compressedPath}"`, { stdio: 'pipe' });
        return compressedPath;
      } catch (error) {
        console.warn('⚠️ Compression failed - gzip not available');
        return null;
      }
    } catch (error) {
      console.warn('⚠️ Compression failed:', error.message);
      return null;
    }
  }

  /**
   * Private helper: Load backup history
   */
  private async loadBackupHistory(): Promise<void> {
    try {
      const historyPath = path.join(this.config.backupPath, 'backup_history.json');
      const historyData = await fs.readFile(historyPath, 'utf8');
      this.backupHistory = JSON.parse(historyData).map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt)
      }));
    } catch (error) {
      // History file doesn't exist or is corrupted - start fresh
      this.backupHistory = [];
    }
  }

  /**
   * Private helper: Save backup history
   */
  private async saveBackupHistory(): Promise<void> {
    try {
      const historyPath = path.join(this.config.backupPath, 'backup_history.json');
      await fs.writeFile(historyPath, JSON.stringify(this.backupHistory, null, 2));
    } catch (error) {
      console.warn('⚠️ Failed to save backup history:', error.message);
    }
  }

  /**
   * Private helper: Cleanup old backups
   */
  private async cleanupOldBackups(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const oldBackups = this.backupHistory.filter(backup => backup.createdAt < cutoffDate);

    for (const backup of oldBackups) {
      await this.deleteBackup(backup.id);
    }

    if (oldBackups.length > 0) {
      console.log(`🧹 Cleaned up ${oldBackups.length} old backups`);
    }
  }

  /**
   * Private helper: Schedule automatic backups
   */
  private scheduleBackups(): void {
    // Simple daily backup - in production, use a proper cron scheduler
    const scheduleDaily = () => {
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(2, 0, 0, 0); // 2 AM

      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const timeUntilBackup = scheduledTime.getTime() - now.getTime();

      this.scheduledBackup = setTimeout(async () => {
        console.log('🔄 Running scheduled backup...');
        await this.createBackup();
        scheduleDaily(); // Schedule next backup
      }, timeUntilBackup);

      console.log(`⏰ Next backup scheduled for: ${scheduledTime.toISOString()}`);
    };

    scheduleDaily();
  }

  /**
   * Private helper: Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
  }
}

// Export singleton instance
export const backupService = new BackupService();
export default backupService;