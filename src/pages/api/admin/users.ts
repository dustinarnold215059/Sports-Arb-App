import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/middleware/auth';
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
    // Require admin access
    const authResult = await requireAdmin(req);
    if (!authResult.authenticated) {
      return res.status(401).json({
        success: false,
        error: authResult.error || 'Admin access required'
      });
    }

    switch (req.method) {
      case 'GET':
        return handleGetUsers(req, res, authResult.user!);
      case 'PUT':
        return handleUpdateUser(req, res, authResult.user!);
      case 'DELETE':
        return handleDeleteUser(req, res, authResult.user!);
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