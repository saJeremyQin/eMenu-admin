import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import WaitersPage from '../WaitersPage';

// Hoist the mock client to avoid temporal dead zone
const mockClient = vi.hoisted(() => ({ graphql: vi.fn() }));
const mockUseAuthenticator = vi.hoisted(() => vi.fn(() => ({ authStatus: 'authenticated' })));

// Mock Amplify API client
vi.mock('aws-amplify/api', () => ({
  generateClient: () => mockClient,
}));

// Mock Amplify UI authenticator
vi.mock('@aws-amplify/ui-react', () => ({
  useAuthenticator: mockUseAuthenticator,
}));

describe('WaitersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock function on the shared mockClient
    mockClient.graphql = vi.fn();
  });

  it('renders loading state initially', () => {
    mockClient.graphql.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<WaitersPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state when no waiters', async () => {
    mockClient.graphql.mockResolvedValue({ data: { listWaiters: [] } });
    render(<WaitersPage />);
    await waitFor(() => {
      expect(screen.getByText('No waiters found.')).toBeInTheDocument();
    });
  });

  it('renders waiter list with correct data', async () => {
    const mockWaiters = [
      { id: 'w1', email: 'waiter1@test.com', createdAt: '2025-11-01T10:00:00Z', status: 'ACTIVE', isDeleted: false },
      { id: 'w2', email: 'waiter2@test.com', createdAt: '2025-11-02T11:00:00Z', status: 'PENDING', isDeleted: false },
    ];
    mockClient.graphql.mockResolvedValue({ data: { listWaiters: mockWaiters } });

    render(<WaitersPage />);

    await waitFor(() => {
      expect(screen.getByText('waiter1@test.com')).toBeInTheDocument();
      expect(screen.getByText('waiter2@test.com')).toBeInTheDocument();
    });
  });

  it('displays correct status badges', async () => {
    const mockWaiters = [
      { id: 'w1', email: 'active@test.com', createdAt: '2025-11-01T10:00:00Z', status: 'ACTIVE', isDeleted: false },
      { id: 'w2', email: 'pending@test.com', createdAt: '2025-11-02T11:00:00Z', status: 'PENDING', isDeleted: false },
      { id: 'w3', email: 'deleted@test.com', createdAt: '2025-11-03T12:00:00Z', status: 'ACTIVE', isDeleted: true },
    ];
    mockClient.graphql.mockResolvedValue({ data: { listWaiters: mockWaiters } });

    render(<WaitersPage />);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Invited')).toBeInTheDocument();
      expect(screen.getByText('Deleted')).toBeInTheDocument();
    });
  });

  it('shows "-" for missing createdAt', async () => {
    const mockWaiters = [
      { id: 'w1', email: 'test@test.com', createdAt: null, status: 'PENDING', isDeleted: false },
    ];
    mockClient.graphql.mockResolvedValue({ data: { listWaiters: mockWaiters } });

    render(<WaitersPage />);

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // Header row + 1 data row
      expect(rows).toHaveLength(2);
      expect(rows[1]).toHaveTextContent('-');
    });
  });

  it('handles invite waiter submission successfully', async () => {
    const user = userEvent.setup();
    mockClient.graphql
      .mockResolvedValueOnce({ data: { listWaiters: [] } }) // initial load
      .mockResolvedValueOnce({ data: { inviteWaiter: { id: 'w1', email: 'new@test.com', status: 'PENDING' } } }) // invite mutation
      .mockResolvedValueOnce({ data: { listWaiters: [{ id: 'w1', email: 'new@test.com', createdAt: '2025-11-04T10:00:00Z', status: 'PENDING', isDeleted: false }] } }); // reload

    render(<WaitersPage />);

    await waitFor(() => {
      expect(screen.getByText('No waiters found.')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Input email of new waiter');
    const button = screen.getByRole('button', { name: /invite/i });

    await user.type(input, 'new@test.com');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Invite sent')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('new@test.com')).toBeInTheDocument();
    });

    // Input should be cleared
    expect(input).toHaveValue('');
  });

  it('handles invite waiter failure', async () => {
    const user = userEvent.setup();
    mockClient.graphql
      .mockResolvedValueOnce({ data: { listWaiters: [] } }) // initial load
      .mockRejectedValueOnce(new Error('Network error')); // invite fails

    render(<WaitersPage />);

    await waitFor(() => {
      expect(screen.getByText('No waiters found.')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Input email of new waiter');
    const button = screen.getByRole('button', { name: /invite/i });

    await user.type(input, 'fail@test.com');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('disables invite button when email is empty', async () => {
    mockClient.graphql.mockResolvedValue({ data: { listWaiters: [] } });
    render(<WaitersPage />);

    await waitFor(() => {
      expect(screen.getByText('No waiters found.')).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /invite/i });
    expect(button).toBeDisabled();
  });

  it('disables invite button and input during invite submission', async () => {
    const user = userEvent.setup();
    mockClient.graphql
      .mockResolvedValueOnce({ data: { listWaiters: [] } })
      .mockImplementation(() => new Promise(() => {})); // never resolves to keep loading state

    render(<WaitersPage />);

    await waitFor(() => {
      expect(screen.getByText('No waiters found.')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Input email of new waiter');
    const button = screen.getByRole('button', { name: /invite/i });

    await user.type(input, 'test@test.com');
    await user.click(button);

    // During loading
    await waitFor(() => {
      expect(button).toHaveTextContent('Inviting...');
      expect(button).toBeDisabled();
      expect(input).toBeDisabled();
    });
  });

  it('does not fetch waiters when not authenticated', () => {
    mockUseAuthenticator.mockReturnValueOnce({ authStatus: 'unauthenticated' });

    render(<WaitersPage />);

    // Should not call graphql for listWaiters
    expect(mockClient.graphql).not.toHaveBeenCalled();
  });

  it('table headers are correctly rendered', async () => {
    mockClient.graphql.mockResolvedValue({ data: { listWaiters: [] } });
    render(<WaitersPage />);

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Registered At')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });
});
