import { NextRequest, NextResponse } from 'next/server';
import { userDatabase } from '@/lib/userDatabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    console.log('Admin login attempt:', { username, passwordLength: password?.length });

    // Authenticate user
    const user = userDatabase.authenticateUser(username, password);
    
    console.log('Authentication result:', user ? 'Success' : 'Failed');

    if (!user) {
      return NextResponse.json({
        error: 'Invalid credentials',
        success: false
      }, { status: 401 });
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      return NextResponse.json({
        error: 'Admin access required',
        success: false
      }, { status: 403 });
    }

    // In production, you would generate a JWT token here
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus
      },
      success: true,
      token: 'mock-admin-token' // In production, use real JWT
    });

  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json({
      error: 'Authentication failed',
      success: false
    }, { status: 500 });
  }
}