/**
 * Admin Dashboard Component Tests
 * Comprehensive test suite for admin functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminPage from '../src/app/admin/page';

// Mock Next.js components
jest.mock('next/link', () => {
  return function MockedLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock API calls
global.fetch = jest.fn();

// Mock betTracker
jest.mock('../src/lib/betTracking', () => ({
  betTracker: {
    currentUserId: null,
    setCurrentUser: jest.fn(),
    getPortfolioStats: jest.fn(() => ({
      netProfit: 1250.50,
      totalBets: 45,
      winRate: 68.9
    })),
    getAllBets: jest.fn(() => []),
    getArbitrageGroups: jest.fn(() => [])
  }
}));

describe('Admin Dashboard', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Authentication', () => {
    test('should render login form when not authenticated', () => {
      render(<AdminPage />);
      
      expect(screen.getByText('🔐 Admin Access')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    test('should show test accounts information', () => {
      render(<AdminPage />);
      
      expect(screen.getByText('Test Accounts:')).toBeInTheDocument();
      expect(screen.getByText(/admin@test.com/)).toBeInTheDocument();
      expect(screen.getByText(/john_trader/)).toBeInTheDocument();
    });

    test('should handle login form submission', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true })
      });

      render(<AdminPage />);
      
      const usernameInput = screen.getByPlaceholderText('Enter username');
      const passwordInput = screen.getByPlaceholderText('Enter password');
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'admin123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
      });
    });

    test('should show loading state during authentication', async () => {
      (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AdminPage />);
      
      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      expect(screen.getByText('Authenticating...')).toBeInTheDocument();
      expect(loginButton).toBeDisabled();
    });

    test('should display error message on login failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: false, error: 'Invalid credentials' })
      });

      render(<AdminPage />);
      
      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard UI', () => {
    beforeEach(() => {
      // Mock successful authentication
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            users: mockUsers,
            platformStats: mockPlatformStats
          })
        });
    });

    test('should render dashboard header after login', async () => {
      render(<AdminPage />);
      
      // Simulate login
      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('🛡️ Admin Dashboard')).toBeInTheDocument();
        expect(screen.getByText('User Management & Platform Analytics')).toBeInTheDocument();
      });
    });

    test('should display platform statistics', async () => {
      render(<AdminPage />);
      
      // Simulate login
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText('Active Users')).toBeInTheDocument();
        expect(screen.getByText('Premium Users')).toBeInTheDocument();
        expect(screen.getByText('Total Platform Profit')).toBeInTheDocument();
      });
    });

    test('should render user management table', async () => {
      render(<AdminPage />);
      
      // Simulate login
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText('👥 User Management')).toBeInTheDocument();
        expect(screen.getByText('User')).toBeInTheDocument();
        expect(screen.getByText('Role')).toBeInTheDocument();
        expect(screen.getByText('Subscription')).toBeInTheDocument();
        expect(screen.getByText('Portfolio Stats')).toBeInTheDocument();
      });
    });

    test('should have navigation buttons', async () => {
      render(<AdminPage />);
      
      // Simulate login
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /🗄️ Database/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /← Back to Home/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
      });
    });
  });

  describe('User Management', () => {
    beforeEach(() => {
      // Mock successful authentication and user fetch
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            users: mockUsers,
            platformStats: mockPlatformStats
          })
        });
    });

    test('should display user information correctly', async () => {
      render(<AdminPage />);
      
      // Simulate login
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        // Check if mock user data is displayed
        expect(screen.getByText('john_trader')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('sarah_sports')).toBeInTheDocument();
      });
    });

    test('should open edit modal when edit button is clicked', async () => {
      render(<AdminPage />);
      
      // Simulate login
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);
        
        expect(screen.getByText(/Edit User:/)).toBeInTheDocument();
      });
    });

    test('should handle user status toggle', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true })
      });

      render(<AdminPage />);
      
      // Simulate login
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        const disableButtons = screen.getAllByText('Disable');
        fireEvent.click(disableButtons[0]);
        
        expect(fetch).toHaveBeenCalledWith('/api/admin/users', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('toggleStatus')
        }));
      });
    });

    test('should handle refresh button click', async () => {
      render(<AdminPage />);
      
      // Simulate login
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh');
        fireEvent.click(refreshButton);
        
        // Should make another API call
        expect(fetch).toHaveBeenCalledTimes(3); // Login + initial fetch + refresh
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<AdminPage />);
      
      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      });
    });

    test('should handle user fetch errors', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({ success: true })
        })
        .mockRejectedValueOnce(new Error('Failed to fetch'));

      render(<AdminPage />);
      
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper form labels', () => {
      render(<AdminPage />);
      
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    test('should have proper button roles', () => {
      render(<AdminPage />);
      
      const loginButton = screen.getByRole('button', { name: /login/i });
      expect(loginButton).toHaveAttribute('type', 'submit');
    });

    test('should have proper table structure', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            users: mockUsers,
            platformStats: mockPlatformStats
          })
        });

      render(<AdminPage />);
      
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });
    });
  });
});

// Mock data
const mockUsers = [
  {
    id: '1',
    username: 'john_trader',
    email: 'john@example.com',
    role: 'premium' as const,
    subscriptionStatus: 'premium' as const,
    subscriptionExpiry: '2025-12-31T00:00:00.000Z',
    createdAt: '2024-01-15T00:00:00.000Z',
    lastLogin: '2025-01-18T00:00:00.000Z',
    isActive: true,
    stats: {
      totalBets: 25,
      totalProfit: 450.75,
      successRate: 72.5,
      avgProfitPerBet: 18.03,
      lastActivity: new Date(),
      arbitrageOpportunitiesFound: 12,
      totalStakeAmount: 5000,
      bestArbitrageProfit: 125.50,
      scansPerformed: 145,
      apiRequestsUsed: 2800
    }
  },
  {
    id: '2',
    username: 'sarah_sports',
    email: 'sarah@example.com',
    role: 'basic' as const,
    subscriptionStatus: 'basic' as const,
    subscriptionExpiry: '2025-02-28T00:00:00.000Z',
    createdAt: '2024-02-01T00:00:00.000Z',
    lastLogin: '2025-01-17T00:00:00.000Z',
    isActive: true,
    stats: {
      totalBets: 8,
      totalProfit: -25.00,
      successRate: 37.5,
      avgProfitPerBet: -3.13,
      lastActivity: new Date(),
      arbitrageOpportunitiesFound: 3,
      totalStakeAmount: 800,
      bestArbitrageProfit: 45.00,
      scansPerformed: 35,
      apiRequestsUsed: 420
    }
  }
];

const mockPlatformStats = {
  activeUsers: 127,
  totalUsers: 256,
  premiumUsers: 45,
  basicUsers: 182,
  proUsers: 29,
  totalProfit: 12547.89,
  totalBets: 1247,
  totalApiRequests: 45678,
  avgSuccessRate: 65.4
};