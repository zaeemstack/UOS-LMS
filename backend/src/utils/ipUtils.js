import ipaddr from 'ipaddr.js';

// Default university campus subnets (can be overridden via CAMPUS_SUBNETS in .env)
const DEFAULT_CAMPUS_SUBNETS = [
  '10.0.0.0/8',        // University Internal Wi-Fi & Core Network
  '172.16.0.0/12',     // Campus Faculty / Department Subnets
  '172.200.0.0/16',    // University of Sahiwal Department Routers & APs
  '192.168.0.0/16',    // Campus Lab / Classrooms Local Wi-Fi
  '127.0.0.1/32',      // Localhost IPv4
  '::1/128',           // Localhost IPv6
];

/**
 * Returns the list of allowed CIDRs from environment or fallback defaults.
 */
export function getConfiguredCampusSubnets() {
  const envSubnets = process.env.CAMPUS_SUBNETS;
  if (!envSubnets) return DEFAULT_CAMPUS_SUBNETS;
  return envSubnets
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Accurately extracts the client IP address from the request.
 * Handles reverse proxies, headers, and socket addresses.
 */
export function getClientIp(req) {
  let ip = null;

  // 1. Check X-Forwarded-For (take the first leftmost client IP)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = forwarded.split(',');
    ip = list[0].trim();
  }

  // 2. Check X-Real-IP
  if (!ip && req.headers['x-real-ip']) {
    ip = req.headers['x-real-ip'].trim();
  }

  // 3. Fallback to socket remote address or req.ip
  if (!ip) {
    ip = req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip;
  }

  // 4. Normalize IPv4-mapped IPv6 address (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  // 5. Normalize IPv6 loopback (::1) if needed
  if (ip === '::1') {
    ip = '127.0.0.1';
  }

  return ip || '127.0.0.1';
}

/**
 * Checks if a given IP address belongs to any of the allowed campus subnets.
 * Supports IPv4 and IPv6 CIDRs.
 */
export function isIpInCampusSubnet(clientIp) {
  if (!clientIp) return false;

  // Handle IPv4-mapped IPv6 string
  let cleanedIp = clientIp;
  if (cleanedIp.startsWith('::ffff:')) {
    cleanedIp = cleanedIp.replace('::ffff:', '');
  }

  try {
    const parsedClient = ipaddr.process(cleanedIp);
    const subnets = getConfiguredCampusSubnets();

    for (const cidrString of subnets) {
      try {
        const parsedCidr = ipaddr.parseCIDR(cidrString);
        // Compare types: IPv4 with IPv4, IPv6 with IPv6
        if (parsedClient.kind() === parsedCidr[0].kind()) {
          if (parsedClient.match(parsedCidr)) {
            return true;
          }
        }
      } catch (cidrErr) {
        console.warn(`[Network Fence] Warning: Malformed CIDR configuration '${cidrString}':`, cidrErr.message);
      }
    }

    return false;
  } catch (err) {
    console.error(`[Network Fence] Error parsing client IP '${clientIp}':`, err.message);
    return false;
  }
}

/**
 * Checks if a client IP matches a specific Room's router subnet / IP.
 */
export function isIpInRoomSubnet(clientIp, room) {
  if (!room) return { match: true, reason: 'No room specified' };

  // If room router enforcement is globally bypassed
  if (process.env.BYPASS_ROOM_ROUTER === 'true') {
    return { match: true, reason: 'Campus-Wifi Verified (Simulation Bypass)' };
  }

  let cleanedIp = clientIp;
  if (cleanedIp && cleanedIp.startsWith('::ffff:')) cleanedIp = cleanedIp.replace('::ffff:', '');
  if (cleanedIp === '::1' || cleanedIp === 'localhost') cleanedIp = '127.0.0.1';

  // Core gateway fallback only when explicitly enabled in .env
  if (process.env.ALLOW_CAMPUS_CORE_GATEWAY === 'true') {
    if (cleanedIp === '172.200.32.1') {
      return { match: true, reason: 'Campus-Wifi Core Gateway Verified (172.200.32.1)' };
    }
  }

  // 1. Direct router IP match
  if (room.routerIp && cleanedIp === room.routerIp) {
    return { match: true, reason: `Exact Router Gateway match (${room.routerIp})` };
  }

  // 2. CIDR subnet match (supports comma/space separated list e.g. "172.200.47.0/24, 172.200.37.0/24")
  if (room.assignedSubnet) {
    const subnets = room.assignedSubnet.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    for (const rawSubnet of subnets) {
      try {
        const parsedClient = ipaddr.process(cleanedIp);
        let subnet = rawSubnet;
        if (!subnet.includes('/')) subnet = `${subnet}/24`;
        const parsedCidr = ipaddr.parseCIDR(subnet);
        if (parsedClient.kind() === parsedCidr[0].kind() && parsedClient.match(parsedCidr)) {
          return { match: true, reason: `Matches Classroom Subnet ${rawSubnet}` };
        }
      } catch (_) {}
    }
  }

  // 3. Subnet prefix match (e.g. 172.200.47.X matches 172.200.47.193, 172.200.37.X matches 172.200.37.26)
  if (room.routerIp) {
    const partsA = cleanedIp.split('.');
    const partsB = room.routerIp.split('.');
    if (partsA.length === 4 && partsB.length === 4 && partsA[0] === partsB[0] && partsA[1] === partsB[1] && partsA[2] === partsB[2]) {
      return { match: true, reason: `Matches Router Subnet ${partsB.slice(0, 3).join('.')}.x` };
    }
  }

  return {
    match: false,
    reason: `Connected IP (${cleanedIp}) does not match ${room.routerName || ('Room ' + room.roomNumber)} router. Please connect to classroom Wi-Fi (${room.assignedSubnet || room.routerIp}).`
  };
}

/**
 * Generates network diagnostic data for the client and admin view.
 */
export function getNetworkDiagnostics(clientIp) {
  const isAllowed = isIpInCampusSubnet(clientIp);
  const configuredSubnets = getConfiguredCampusSubnets();
  const isBypassed = process.env.BYPASS_NETWORK_FENCE === 'true';

  return {
    clientIp,
    isAllowed: isBypassed || isAllowed,
    isPerimeterEnforced: !isBypassed,
    configuredSubnets,
    timestamp: new Date().toISOString(),
  };
}
