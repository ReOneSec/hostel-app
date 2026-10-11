import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', async () => {
  const { mockDeep } = await import('vitest-mock-extended');
  return {
    prisma: mockDeep()
  };
});

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'admin-1', role: 'SUPER_ADMIN' }
  })
}));

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(true),
  getIpAddress: vi.fn().mockReturnValue('127.0.0.1'),
  getUserAgent: vi.fn().mockReturnValue('test-agent'),
}));

import { prisma } from '@/lib/prisma';
import { POST as createRoom } from '@/app/api/hostels/[id]/rooms/route';
import { PATCH as updateRoom } from '@/app/api/hostels/[id]/rooms/[roomId]/route';

const prismaMock = prisma as any;

describe('Rooms API - Previous Room Name Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a room with previousRoomNumber', async () => {
    prismaMock.room.findUnique.mockResolvedValue(null);
    prismaMock.room.create.mockResolvedValue({
      id: 'room-1',
      roomNumber: 'L01',
      previousRoomNumber: 'Old 101',
      roomType: 'DOUBLE',
      hostelId: 'hostel-1'
    });

    const req = new NextRequest('http://localhost:3000/api/hostels/hostel-1/rooms', {
      method: 'POST',
      body: JSON.stringify({
        roomNumber: 'L01',
        previousRoomNumber: 'Old 101',
        type: 'DOUBLE'
      })
    });

    const res = await createRoom(req, { params: Promise.resolve({ id: 'hostel-1' }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.previousRoomNumber).toBe('Old 101');
    expect(prismaMock.room.create).toHaveBeenCalledWith({
      data: {
        roomNumber: 'L01',
        previousRoomNumber: 'Old 101',
        roomType: 'DOUBLE',
        hostelId: 'hostel-1'
      }
    });
  });

  it('updates a room with previousRoomNumber', async () => {
    prismaMock.room.findUnique.mockResolvedValue({
      id: 'room-1',
      roomNumber: 'L01',
      previousRoomNumber: null,
      roomType: 'DOUBLE',
      hostelId: 'hostel-1'
    });

    prismaMock.room.update.mockResolvedValue({
      id: 'room-1',
      roomNumber: 'L01',
      previousRoomNumber: 'Prev-L01',
      roomType: 'DOUBLE',
      hostelId: 'hostel-1'
    });

    const req = new NextRequest('http://localhost:3000/api/hostels/hostel-1/rooms/room-1', {
      method: 'PATCH',
      body: JSON.stringify({
        previousRoomNumber: 'Prev-L01'
      })
    });

    const res = await updateRoom(req, {
      params: Promise.resolve({ id: 'hostel-1', roomId: 'room-1' })
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.previousRoomNumber).toBe('Prev-L01');
    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: {
        roomNumber: undefined,
        previousRoomNumber: 'Prev-L01',
        roomType: undefined
      }
    });
  });
});
