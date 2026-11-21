import { Router } from 'express';
import { getNetworkDiagnostics, getClientIp, isIpInRoomSubnet } from '../utils/ipUtils.js';
import prisma from '../config/db.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

/**
 * Returns network status and perimeter check without hard-blocking
 */
router.get('/status', (req, res) => {
  let clientIp = getClientIp(req);
  if (process.env.NODE_ENV !== 'production' && req.headers['x-simulated-ip']) {
    clientIp = req.headers['x-simulated-ip'].trim();
  }

  const diagnostics = getNetworkDiagnostics(clientIp);

  res.json({
    success: true,
    diagnostics,
  });
});

/**
 * GET /api/network/rooms
 * Fetch all rooms with their configured router / geofence settings
 */
router.get('/rooms', requireAuth, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: [{ building: 'asc' }, { roomNumber: 'asc' }],
      include: {
        _count: {
          select: { slots: true }
        }
      }
    });

    let clientIp = getClientIp(req);
    if (process.env.NODE_ENV !== 'production' && req.headers['x-simulated-ip']) {
      clientIp = req.headers['x-simulated-ip'].trim();
    }

    res.json({
      success: true,
      clientIp,
      rooms,
    });
  } catch (err) {
    console.error('Error fetching rooms:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch rooms.' });
  }
});

/**
 * POST /api/network/rooms
 * Admin adds a new classroom with optional router geofencing info
 */
router.post('/rooms', requireAuth, requireRole('ADMIN', 'HOD'), async (req, res) => {
  try {
    const { roomNumber, building, floor, routerName, routerIp, routerMac, routerSsid, assignedSubnet } = req.body;
    if (!roomNumber) {
      return res.status(400).json({ success: false, message: 'Room number is required (e.g. 4.1.20).' });
    }
    const cleanRoom = roomNumber.trim();
    const existing = await prisma.room.findUnique({ where: { roomNumber: cleanRoom } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Room ${cleanRoom} already exists.` });
    }

    const room = await prisma.room.create({
      data: {
        roomNumber: cleanRoom,
        building: (building || 'Academic Block').trim(),
        floor: parseInt(floor || 1, 10),
        routerName: routerName?.trim() || null,
        routerIp: routerIp?.trim() || null,
        routerMac: routerMac ? routerMac.trim().toUpperCase() : null,
        routerSsid: routerSsid?.trim() || null,
        assignedSubnet: assignedSubnet?.trim() || null,
      },
    });

    res.status(201).json({
      success: true,
      message: `Classroom ${room.roomNumber} created successfully.`,
      room,
    });
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ success: false, message: 'Failed to create room.' });
  }
});

/**
 * DELETE /api/network/rooms/:id
 */
router.delete('/rooms/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.room.delete({ where: { id } });
    res.json({ success: true, message: 'Classroom deleted successfully.' });
  } catch (err) {
    console.error('Error deleting room:', err);
    res.status(500).json({ success: false, message: 'Failed to delete room. Ensure no timetable slots exist for it.' });
  }
});

/**
 * PUT /api/network/rooms/:id
 * Admin / HOD updates router geofencing info for a room
 */
router.put('/rooms/:id', requireAuth, requireRole('ADMIN', 'HOD'), async (req, res) => {
  try {
    const { id } = req.params;
    const { routerName, routerIp, routerMac, routerSsid, assignedSubnet } = req.body;

    const updated = await prisma.room.update({
      where: { id },
      data: {
        routerName: routerName || null,
        routerIp: routerIp || null,
        routerMac: routerMac ? routerMac.trim().toUpperCase() : null,
        routerSsid: routerSsid || null,
        assignedSubnet: assignedSubnet || null,
      },
    });

    res.json({
      success: true,
      message: `Room ${updated.roomNumber} router geofence updated successfully.`,
      room: updated,
    });
  } catch (err) {
    console.error('Error updating room router:', err);
    res.status(500).json({ success: false, message: 'Failed to update room router configuration.' });
  }
});

/**
 * POST /api/network/rooms/:id/auto-link
 * 1-Click Auto-link: Detects caller's current connected IP/Subnet and assigns it to the room
 */
router.post('/rooms/:id/auto-link', requireAuth, requireRole('ADMIN', 'HOD'), async (req, res) => {
  try {
    const { id } = req.params;
    let clientIp = getClientIp(req);
    if (process.env.NODE_ENV !== 'production' && req.headers['x-simulated-ip']) {
      clientIp = req.headers['x-simulated-ip'].trim();
    }

    // Determine C-class subnet from client IP (e.g. 192.168.52.23 -> 192.168.52.0/24)
    const ipParts = clientIp.split('.');
    const autoSubnet = ipParts.length === 4 ? `${ipParts.slice(0, 3).join('.')}.0/24` : `${clientIp}/32`;
    const autoGateway = ipParts.length === 4 ? `${ipParts.slice(0, 3).join('.')}.1` : clientIp;

    const updated = await prisma.room.update({
      where: { id },
      data: {
        routerIp: autoGateway,
        assignedSubnet: autoSubnet,
        routerName: `Router (${ipParts.length === 4 ? ipParts[2] : 'AP'}) - Room ${id.slice(0, 4)}`,
      },
    });

    res.json({
      success: true,
      message: `Auto-linked Room ${updated.roomNumber} to current Wi-Fi (${autoSubnet})`,
      room: updated,
      detectedIp: clientIp,
    });
  } catch (err) {
    console.error('Error auto-linking room:', err);
    res.status(500).json({ success: false, message: 'Failed to auto-link room.' });
  }
});

/**
 * POST /api/network/verify-room & POST /api/network/verify-campus
 * Verifies if current client IP is connected to University Campus Wi-Fi before marking attendance.
 * Specific room router restriction is bypassed so any campus Wi-Fi AP is accepted.
 */
router.post('/verify-room', requireAuth, async (req, res) => {
  try {
    const { roomId, slotId } = req.body;
    let clientIp = getClientIp(req);
    if (process.env.NODE_ENV !== 'production' && req.headers['x-simulated-ip']) {
      clientIp = req.headers['x-simulated-ip'].trim();
    }

    let targetRoom = null;
    if (roomId) {
      targetRoom = await prisma.room.findUnique({ where: { id: roomId } });
    } else if (slotId) {
      const slot = await prisma.timetableSlot.findUnique({
        where: { id: slotId },
        include: { room: true },
      });
      targetRoom = slot?.room;
    }

    const { isIpInCampusSubnet } = await import('../utils/ipUtils.js');
    const isCampus = isIpInCampusSubnet(clientIp) || process.env.BYPASS_NETWORK_FENCE === 'true';

    res.json({
      success: true,
      clientIp,
      roomNumber: targetRoom?.roomNumber || 'Any',
      routerName: 'University Campus Wi-Fi',
      routerIp: clientIp,
      isCampusNetwork: isCampus,
      isMatched: isCampus, // As long as connected to University Wi-Fi, it's valid!
      reason: isCampus
        ? 'Connected to authorized University Campus Wi-Fi'
        : 'Device not connected to University Campus Wi-Fi network.',
    });
  } catch (err) {
    console.error('Error verifying network:', err);
    res.status(500).json({ success: false, message: 'Failed to verify campus network.' });
  }
});

export default router;
