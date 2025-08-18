import { NextRequest, NextResponse } from 'next/server';
import { userDatabase, addSampleBettingData } from '@/lib/userDatabase';

// Declare global to track if sample data has been added
declare global {
  var sampleDataAdded: boolean | undefined;
}

export async function GET(request: NextRequest) {
  try {
    // In production, verify admin authentication here
    const users = userDatabase.getAllUsers();
    const platformStats = userDatabase.getPlatformStats();

    return NextResponse.json({
      users,
      platformStats,
      success: true
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      error: 'Failed to fetch users',
      success: false
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, data, portfolioData } = body;

    switch (action) {
      case 'getUsers':
        // Get users with real portfolio data from client
        const usersWithRealStats = userDatabase.getAllUsersWithPortfolioData(portfolioData);
        const platformStatsWithRealData = userDatabase.getPlatformStatsWithData(portfolioData);
        
        return NextResponse.json({
          users: usersWithRealStats,
          platformStats: platformStatsWithRealData,
          success: true
        });

      case 'updateSubscription':
        const subscriptionResult = userDatabase.updateUserSubscription(
          userId,
          data.subscriptionStatus,
          data.expiryDays
        );
        return NextResponse.json({
          success: subscriptionResult,
          message: subscriptionResult ? 'Subscription updated' : 'User not found'
        });

      case 'updateUserRole':
        const roleResult = userDatabase.updateUserRole(
          userId,
          data.role,
          data.subscriptionStatus,
          data.expiryDays
        );
        return NextResponse.json({
          success: roleResult,
          message: roleResult ? 'User role and subscription updated' : 'User not found'
        });

      case 'toggleStatus':
        const statusResult = userDatabase.toggleUserStatus(userId);
        return NextResponse.json({
          success: statusResult,
          message: statusResult ? 'User status updated' : 'User not found'
        });

      case 'updateStats':
        const statsResult = userDatabase.updateUserStats(userId, data);
        return NextResponse.json({
          success: statsResult,
          message: statsResult ? 'Stats updated' : 'User not found'
        });

      default:
        return NextResponse.json({
          error: 'Invalid action',
          success: false
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({
      error: 'Failed to update user',
      success: false
    }, { status: 500 });
  }
}