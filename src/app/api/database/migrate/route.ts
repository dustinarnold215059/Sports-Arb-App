import { NextRequest, NextResponse } from 'next/server';
import { migrationService } from '@/lib/migrationService';

export async function POST(request: NextRequest) {
  try {
    console.log('=== STARTING DATABASE MIGRATION ===');
    
    const result = await migrationService.migrateFromLocalStorage();
    
    console.log('=== MIGRATION COMPLETE ===');
    console.log('Users migrated:', result.usersmigrated);
    console.log('Bets migrated:', result.betsMigrated);
    console.log('Portfolios migrated:', result.portfoliosMigrated);
    console.log('Errors:', result.errors);
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Migration completed successfully' : 'Migration completed with errors',
      details: {
        usersMigrated: result.usersmigrated,
        betsMigrated: result.betsMigrated,
        portfoliosMigrated: result.portfoliosMigrated,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error('Migration API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const verification = await migrationService.verifyMigration();
    
    return NextResponse.json({
      success: true,
      verification
    });
  } catch (error) {
    console.error('Migration verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Verification failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}