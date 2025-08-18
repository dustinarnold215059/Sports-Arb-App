'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { ModernCard, ModernCardHeader, ModernCardBody } from "../../../shared/components/ui/ModernCard";
import { ModernButton } from "../../../shared/components/ui/ModernButton";
import { ModernBadge } from "../../../shared/components/ui/ModernBadge";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface MigrationResult {
  success: boolean;
  usersMigrated?: number;
  betsMigrated?: number;
  portfoliosMigrated?: number;
  errors?: string[];
}

interface VerificationResult {
  usersInDB: number;
  betsInDB: number;
  portfoliosInDB: number;
  usersInLocalStorage: number;
  betsInLocalStorage: number;
}

export default function DatabaseAdminPage() {
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [operation, setOperation] = useState<string>('');

  const handleMigration = async () => {
    setIsLoading(true);
    setOperation('Migrating data from localStorage to database...');
    
    try {
      const response = await fetch('/api/database/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      setMigrationResult(result);
      
      if (result.success) {
        // Also get verification after successful migration
        handleVerification();
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationResult({
        success: false,
        errors: [`Migration API error: ${error.message}`]
      });
    } finally {
      setIsLoading(false);
      setOperation('');
    }
  };

  const handleVerification = async () => {
    setIsLoading(true);
    setOperation('Verifying migration status...');
    
    try {
      const response = await fetch('/api/database/migrate');
      const result = await response.json();
      
      if (result.success) {
        setVerificationResult(result.verification);
      }
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsLoading(false);
      setOperation('');
    }
  };

  const clearResults = () => {
    setMigrationResult(null);
    setVerificationResult(null);
  };

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Navigation />
        
        <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/30">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Database Management</h1>
                <p className="text-gray-400 text-sm">Migrate data from localStorage to database</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-400">Migration Status</div>
                  <div className="text-lg font-bold text-blue-400">
                    {isLoading ? 'Processing...' : 'Ready'}
                  </div>
                </div>
                <div className={`status-indicator ${isLoading ? 'status-warning' : 'status-active'}`}>
                  <span>{isLoading ? operation : 'System Ready'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Control Panel */}
          <ModernCard variant="glass">
            <ModernCardHeader>
              <h2 className="text-xl font-semibold text-white">Migration Control Panel</h2>
              <p className="text-gray-300 text-sm">
                Migrate user data, bets, and portfolios from localStorage to PostgreSQL database
              </p>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ModernButton 
                  onClick={handleMigration}
                  disabled={isLoading}
                  variant="primary"
                  fullWidth
                >
                  🚀 Start Migration
                </ModernButton>
                
                <ModernButton 
                  onClick={handleVerification}
                  disabled={isLoading}
                  variant="secondary"
                  fullWidth
                >
                  🔍 Verify Data
                </ModernButton>
                
                <ModernButton 
                  onClick={clearResults}
                  disabled={isLoading}
                  variant="ghost"
                  fullWidth
                >
                  🧹 Clear Results
                </ModernButton>
              </div>
              
              {isLoading && (
                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                    <div className="text-blue-300 font-medium">{operation}</div>
                  </div>
                </div>
              )}
            </ModernCardBody>
          </ModernCard>

          {/* Verification Results */}
          {verificationResult && (
            <ModernCard variant="default">
              <ModernCardHeader>
                <h3 className="text-lg font-semibold text-white">📊 Data Verification</h3>
              </ModernCardHeader>
              <ModernCardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-white">Database Status</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Users in Database:</span>
                        <ModernBadge variant="success">{verificationResult.usersInDB}</ModernBadge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Bets in Database:</span>
                        <ModernBadge variant="success">{verificationResult.betsInDB}</ModernBadge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Portfolios in Database:</span>
                        <ModernBadge variant="success">{verificationResult.portfoliosInDB}</ModernBadge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold text-white">LocalStorage Status</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Users in LocalStorage:</span>
                        <ModernBadge variant="warning">{verificationResult.usersInLocalStorage}</ModernBadge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Bets in LocalStorage:</span>
                        <ModernBadge variant="warning">{verificationResult.betsInLocalStorage}</ModernBadge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Migration Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">
                        {verificationResult.usersInDB >= verificationResult.usersInLocalStorage ? '✅' : '⚠️'}
                      </div>
                      <div className="text-gray-300">Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">
                        {verificationResult.betsInDB >= verificationResult.betsInLocalStorage ? '✅' : '⚠️'}
                      </div>
                      <div className="text-gray-300">Bets</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">
                        {verificationResult.portfoliosInDB >= verificationResult.usersInDB ? '✅' : '⚠️'}
                      </div>
                      <div className="text-gray-300">Portfolios</div>
                    </div>
                  </div>
                </div>
              </ModernCardBody>
            </ModernCard>
          )}

          {/* Migration Results */}
          {migrationResult && (
            <ModernCard variant="default">
              <ModernCardHeader>
                <h3 className="text-lg font-semibold text-white">
                  {migrationResult.success ? '✅ Migration Results' : '❌ Migration Failed'}
                </h3>
              </ModernCardHeader>
              <ModernCardBody>
                {migrationResult.success ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {migrationResult.usersMigrated || 0}
                        </div>
                        <div className="text-green-300 text-sm">Users Migrated</div>
                      </div>
                      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {migrationResult.betsMigrated || 0}
                        </div>
                        <div className="text-blue-300 text-sm">Bets Migrated</div>
                      </div>
                      <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {migrationResult.portfoliosMigrated || 0}
                        </div>
                        <div className="text-purple-300 text-sm">Portfolios Migrated</div>
                      </div>
                    </div>
                    
                    {migrationResult.errors && migrationResult.errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-yellow-400 mb-2">Warnings/Errors:</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {migrationResult.errors.map((error, index) => (
                            <div key={index} className="text-sm text-yellow-300 bg-yellow-900/20 p-2 rounded">
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-red-300">Migration failed. Please check the errors below:</div>
                    {migrationResult.errors && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {migrationResult.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-300 bg-red-900/20 p-3 rounded">
                            {error}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </ModernCardBody>
            </ModernCard>
          )}

          {/* Instructions */}
          <ModernCard variant="glass">
            <ModernCardHeader>
              <h3 className="text-lg font-semibold text-white">📋 Instructions</h3>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="space-y-4 text-gray-300">
                <div>
                  <h4 className="font-semibold text-white mb-2">Before Migration:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Ensure PostgreSQL database is running and accessible</li>
                    <li>• Verify DATABASE_URL environment variable is set correctly</li>
                    <li>• Run &quot;npx prisma db push&quot; to create database schema</li>
                    <li>• Backup your localStorage data if needed</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-white mb-2">Migration Process:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Reads all user data from localStorage</li>
                    <li>• Migrates users, bets, and portfolio data to PostgreSQL</li>
                    <li>• Maintains all relationships and data integrity</li>
                    <li>• Creates portfolios for users who don&apos;t have them</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-white mb-2">After Migration:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Verify data integrity using the verification tool</li>
                    <li>• Update application code to use database services</li>
                    <li>• Consider clearing localStorage once everything works</li>
                    <li>• Monitor performance and optimize queries as needed</li>
                  </ul>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>
        </div>
      </div>
    </ProtectedRoute>
  );
}