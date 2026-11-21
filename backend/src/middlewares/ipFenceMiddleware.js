import { isIpInCampusSubnet, getClientIp, getConfiguredCampusSubnets } from '../utils/ipUtils.js';
import prisma from '../config/db.js';

/**
 * Express Middleware: Network Perimeter Fence Gatekeeper
 * Restricts all API endpoints (or specific protected routes) to University Wi-Fi / IP subnets.
 */
export const ipFenceMiddleware = (options = { logViolations: true }) => {
  return async (req, res, next) => {
    // Check if network perimeter fence is bypassed globally
    if (process.env.BYPASS_NETWORK_FENCE === 'true') {
      req.isCampusNetwork = true;
      req.clientIp = getClientIp(req);
      return next();
    }

    // Support simulated IP header in non-production for testing perimeter breach
    let clientIp = getClientIp(req);
    if (process.env.NODE_ENV !== 'production' && req.headers['x-simulated-ip']) {
      clientIp = req.headers['x-simulated-ip'].trim();
    }

    req.clientIp = clientIp;

    const isAllowed = isIpInCampusSubnet(clientIp);

    if (!isAllowed) {
      // Log perimeter breach asynchronously
      if (options.logViolations) {
        prisma.networkAuditLog.create({
          data: {
            ipAddress: clientIp,
            userAgent: req.headers['user-agent'] || 'Unknown Device',
            endpoint: req.originalUrl || req.url,
            isAllowed: false,
            reason: 'Unauthorized connection: IP outside university campus subnets',
            userId: req.user?.id || null,
          },
        }).catch((err) => {
          console.error('[Network Fence] Failed to write audit log:', err.message);
        });
      }

      return res.status(403).json({
        success: false,
        code: 'CAMPUS_PERIMETER_RESTRICTION',
        message: 'Access Denied: You must be connected to the authorized University campus Wi-Fi network.',
        clientIp: clientIp,
        allowedSubnets: process.env.NODE_ENV === 'development' ? getConfiguredCampusSubnets() : undefined,
        timestamp: new Date().toISOString(),
      });
    }

    req.isCampusNetwork = true;
    next();
  };
};

/**
 * Lightweight check to provide client status without blocking
 */
export const ipInspectorMiddleware = (req, res, next) => {
  let clientIp = getClientIp(req);
  if (process.env.NODE_ENV !== 'production' && req.headers['x-simulated-ip']) {
    clientIp = req.headers['x-simulated-ip'].trim();
  }
  req.clientIp = clientIp;
  req.isCampusNetwork = isIpInCampusSubnet(clientIp);
  next();
};
