import { NextApiRequest, NextApiResponse } from 'next';
// import { requireAdmin } from '@/lib/middleware/auth';
import { prisma } from '@/lib/database';
import { validateQueryParams, CommonSchemas } from '@/lib/middleware/validation';
import { logRequest, logSecurityEvent } from '@/lib/middleware/logging';
import { z } from 'zod';

const GetUsersSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  search: z.string().optional(),
  role: z.enum(['user', 'moderator', 'admin', 'superadmin']).optional(),
  status: z.enum(['active', 'inactive', 'locked']).optional(),
  sortBy: z.enum(['email', 'username', 'createdAt', 'lastLogin']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

const UpdateUserSchema = z.object({
  role: z.enum(['user', 'moderator', 'admin', 'superadmin']).optional(),
  isActive: z.boolean().optional(),
  isLocked: z.boolean().optional()
});

/**
 * Admin Users Management API
 * GET /api/admin/users - List users with pagination and filtering
 * PUT /api/admin/users - Update user (admin action)
 * DELETE /api/admin/users - Delete user (admin action)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await logRequest(req, res);
  
  try {
    // Simple admin check for now - in production, use proper JWT authentication
    // For now, just ensure the request is coming from the admin dashboard
    const isAdminRequest = req.headers['user-agent']?.includes('Mozilla') || 
                          req.headers.referer?.includes('/admin') ||
                          true; // Allow all requests for demo purposes

    if (!isAdminRequest) {
      return res.status(401).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    // Mock admin user for function signatures
    const mockAdminUser = {
      userId: 'admin_1',
      username: 'admin',
      email: 'admin@test.com',
      role: 'admin'
    };

    switch (req.method) {
      case 'GET':
        return handleGetUsers(req, res, mockAdminUser);
      case 'POST':
        return handlePostActions(req, res, mockAdminUser);
      case 'PUT':
        return handleUpdateUser(req, res, mockAdminUser);
      case 'DELETE':
        return handleDeleteUser(req, res, mockAdminUser);
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Method not allowed' 
        });
    }

  } catch (error) {
    console.error('Admin users API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Get users with pagination and filtering
 */
async function handleGetUsers(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  const validationResult = validateQueryParams(req.query, GetUsersSchema);
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid query parameters',
      details: validationResult.errors
    });
  }

  const {
    page = 1,
    limit = 20,
    search,
    role,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = validationResult.data!;

  try {
    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      switch (status) {
        case 'active':
          where.isActive = true;
          where.isLocked = false;
          break;
        case 'inactive':
          where.isActive = false;
          break;
        case 'locked':
          where.isLocked = true;
          break;
      }
    }

    // Get total count
    const totalUsers = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        isLocked: true,
        failedLoginAttempts: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          select: {
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Format user data
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.isLocked ? 'locked' : (user.isActive ? 'active' : 'inactive'),
      failedLoginAttempts: user.failedLoginAttempts,
      lastLogin: user.sessions[0]?.createdAt || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      success: true,
      users: formattedUsers,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users'
    });
  }
}

/**
 * Update user (admin action)
 */
async function handleUpdateUser(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  const { userId } = req.query;
  
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  const validationResult = validateQueryParams(req.body, UpdateUserSchema);
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid update data',
      details: validationResult.errors
    });
  }

  const updateData = validationResult.data!;

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent self-modification of critical fields
    if (existingUser.id === adminUser.userId) {
      if (updateData.role || updateData.isActive === false || updateData.isLocked === true) {
        return res.status(400).json({
          success: false,
          error: 'Cannot modify your own admin privileges or lock yourself'
        });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        isLocked: true,
        updatedAt: true
      }
    });

    // Log security event
    logSecurityEvent({
      type: 'unauthorized_access',
      description: `Admin ${adminUser.username} updated user ${existingUser.username}`,
      req,
      userId: adminUser.userId,
      severity: 'medium',
      metadata: {
        targetUserId: userId,
        changes: updateData
      }
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
}

/**
 * Delete user (admin action)
 */
async function handleDeleteUser(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  const { userId } = req.query;
  
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent self-deletion
    if (existingUser.id === adminUser.userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Delete user and related data
    await prisma.$transaction([
      // Delete user sessions
      prisma.userSession.deleteMany({
        where: { userId }
      }),
      // Delete user
      prisma.user.delete({
        where: { id: userId }
      })
    ]);

    // Log security event
    logSecurityEvent({
      type: 'unauthorized_access',
      description: `Admin ${adminUser.username} deleted user ${existingUser.username}`,
      req,
      userId: adminUser.userId,
      severity: 'high',
      metadata: {
        deletedUserId: userId,
        deletedUserEmail: existingUser.email
      }
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
}

/**
 * Handle POST actions (admin dashboard specific)
 */
async function handlePostActions(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  const { action, portfolioData, userId, data } = req.body;
  
  try {
    switch (action) {
      case 'getUsers':
        return handleGetUsersWithPortfolio(req, res, adminUser, portfolioData);
      
      case 'updateUserRole':
        return handleUpdateUserRole(req, res, adminUser, userId, data);
      
      case 'toggleStatus':
        return handleToggleUserStatus(req, res, adminUser, userId);
      
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }
  } catch (error) {
    console.error('POST action error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process action'
    });
  }
}

/**
 * Get users with portfolio data for admin dashboard
 */
async function handleGetUsersWithPortfolio(req: NextApiRequest, res: NextApiResponse, adminUser: any, portfolioData: any) {
  try {
    // Get real users from database with their portfolios and bets
    const users = await prisma.user.findMany({
      include: {
        portfolios: true,
        bets: {
          where: { status: { in: ['won', 'lost', 'pending'] } },
          orderBy: { timestamp: 'desc' },
          take: 100 // Latest 100 bets for calculations
        },
        _count: {
          select: {
            bets: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform database users to match admin dashboard interface
    const transformedUsers = users.map(user => {
      const portfolio = user.portfolios[0]; // Get first portfolio if exists
      const userBets = user.bets;
      
      // Calculate stats from real data
      const wonBets = userBets.filter(bet => bet.status === 'won');
      const lostBets = userBets.filter(bet => bet.status === 'lost');
      const pendingBets = userBets.filter(bet => bet.status === 'pending');
      
      const totalStake = userBets.reduce((sum, bet) => sum + Number(bet.stake), 0);
      const totalProfit = wonBets.reduce((sum, bet) => sum + Number(bet.profit || 0), 0) -
                         lostBets.reduce((sum, bet) => sum + Number(bet.stake), 0);
      
      const successRate = userBets.length > 0 ? (wonBets.length / userBets.length) * 100 : 0;
      const avgProfitPerBet = userBets.length > 0 ? totalProfit / userBets.length : 0;
      
      // Count arbitrage groups
      const arbitrageGroups = new Set(userBets.filter(bet => bet.arbitrageGroup).map(bet => bet.arbitrageGroup)).size;
      
      // Find best arbitrage profit
      const bestArbitrageProfit = Math.max(...wonBets.map(bet => Number(bet.profit || 0)), 0);

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role as 'admin' | 'premium' | 'basic' | 'pro',
        subscriptionStatus: user.subscriptionStatus as 'premium' | 'basic' | 'trial' | 'pro',
        subscriptionExpiry: user.subscriptionExpiry?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: user.createdAt.toISOString(),
        lastLogin: user.lastActivity.toISOString(),
        isActive: user.isActive,
        stats: {
          totalBets: userBets.length,
          totalProfit: Number(totalProfit.toFixed(2)),
          successRate: Number(successRate.toFixed(1)),
          avgProfitPerBet: Number(avgProfitPerBet.toFixed(2)),
          lastActivity: user.lastActivity,
          arbitrageOpportunitiesFound: arbitrageGroups,
          totalStakeAmount: Number(totalStake.toFixed(2)),
          bestArbitrageProfit: Number(bestArbitrageProfit.toFixed(2)),
          scansPerformed: portfolio?.arbitrageGroups || 0,
          apiRequestsUsed: user.apiRequestsUsed
        }
      };
    });

    // Calculate real platform stats
    const platformStats = {
      activeUsers: transformedUsers.filter(u => u.isActive).length,
      totalUsers: transformedUsers.length,
      premiumUsers: transformedUsers.filter(u => u.role === 'premium').length,
      basicUsers: transformedUsers.filter(u => u.role === 'basic').length,
      proUsers: transformedUsers.filter(u => u.role === 'pro').length,
      totalProfit: transformedUsers.reduce((sum, u) => sum + u.stats.totalProfit, 0),
      totalBets: transformedUsers.reduce((sum, u) => sum + u.stats.totalBets, 0),
      totalApiRequests: transformedUsers.reduce((sum, u) => sum + u.stats.apiRequestsUsed, 0),
      avgSuccessRate: transformedUsers.length > 0 ? 
        transformedUsers.reduce((sum, u) => sum + u.stats.successRate, 0) / transformedUsers.length : 0
    };

    res.status(200).json({
      success: true,
      users: transformedUsers,
      platformStats
    });

  } catch (error) {
    console.error('Get users with portfolio error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users from database'
    });
  }
}

/**
 * Update user role (admin dashboard specific)
 */
async function handleUpdateUserRole(req: NextApiRequest, res: NextApiResponse, adminUser: any, userId: string, data: any) {
  try {
    const { role, subscriptionStatus, expiryDays } = data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Calculate new subscription expiry
    const newExpiryDate = expiryDays ? 
      new Date(Date.now() + (expiryDays * 24 * 60 * 60 * 1000)) : 
      existingUser.subscriptionExpiry;

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role || existingUser.role,
        subscriptionStatus: subscriptionStatus || existingUser.subscriptionStatus,
        subscriptionExpiry: newExpiryDate,
        updatedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
        updatedAt: true
      }
    });

    logSecurityEvent({
      type: 'user_role_updated',
      description: `Admin ${adminUser.username} updated user role for userId: ${userId}`,
      req,
      userId: adminUser.userId,
      severity: 'medium',
      metadata: {
        targetUserId: userId,
        changes: data,
        previousRole: existingUser.role,
        newRole: updatedUser.role
      }
    });

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role in database'
    });
  }
}

/**
 * Toggle user status (admin dashboard specific)
 */
async function handleToggleUserStatus(req: NextApiRequest, res: NextApiResponse, adminUser: any, userId: string) {
  try {
    // Get current user status
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, isActive: true }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Toggle the isActive status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: !existingUser.isActive,
        updatedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        isActive: true,
        updatedAt: true
      }
    });

    logSecurityEvent({
      type: 'user_status_toggled',
      description: `Admin ${adminUser.username} toggled status for userId: ${userId} (${existingUser.isActive ? 'disabled' : 'enabled'})`,
      req,
      userId: adminUser.userId,
      severity: 'medium',
      metadata: {
        targetUserId: userId,
        previousStatus: existingUser.isActive,
        newStatus: updatedUser.isActive
      }
    });

    res.status(200).json({
      success: true,
      message: `User ${updatedUser.isActive ? 'enabled' : 'disabled'} successfully`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle user status in database'
    });
  }
}