import { NextRequest, NextResponse } from 'next/server';
import { userDatabase } from '@/lib/userDatabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, planName, paymentId } = await request.json();

    console.log('User upgrade API called with:', { userId, planName, paymentId });

    if (!userId || !planName || !paymentId) {
      console.log('Missing required parameters:', { userId: !!userId, planName: !!planName, paymentId: !!paymentId });
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    // Map plan names to roles and subscription statuses
    const planMapping: Record<string, { role: 'admin' | 'premium' | 'basic' | 'pro', subscriptionStatus: 'premium' | 'basic' | 'trial' | 'pro' }> = {
      'Premium': { role: 'premium', subscriptionStatus: 'premium' },
      'Pro': { role: 'pro', subscriptionStatus: 'pro' },
      'Basic': { role: 'basic', subscriptionStatus: 'basic' }
    };

    const planConfig = planMapping[planName];
    if (!planConfig) {
      return NextResponse.json({
        success: false,
        error: 'Invalid plan name'
      }, { status: 400 });
    }

    // Update user role and subscription
    console.log('Attempting to update user role:', {
      userId,
      role: planConfig.role,
      subscriptionStatus: planConfig.subscriptionStatus,
      expiryDays: 30
    });

    const success = userDatabase.updateUserRole(
      userId,
      planConfig.role,
      planConfig.subscriptionStatus,
      30 // 30 days subscription
    );

    console.log('Update user role result:', success);

    if (success) {
      console.log(`User ${userId} upgraded to ${planName} plan (Payment ID: ${paymentId})`);
      
      return NextResponse.json({
        success: true,
        message: `Successfully upgraded to ${planName} plan`,
        role: planConfig.role,
        subscriptionStatus: planConfig.subscriptionStatus
      });
    } else {
      console.log('Failed to find user with ID:', userId);
      return NextResponse.json({
        success: false,
        error: 'Failed to update user subscription - user not found'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('User upgrade error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error during user upgrade',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}