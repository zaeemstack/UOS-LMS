import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Updating Pilot Rooms with Real Production Routers 52 & 56 ---');

  // Router 52: 172.200.47.193 / MAC: 18:e8:29:08:6d:65 (Rooms 4.1.20 & 4.1.21)
  const room20 = await prisma.room.upsert({
    where: { roomNumber: '4.1.20' },
    update: {
      routerName: 'Router 52 (Physics AP - 4.1.20 / 4.1.21)',
      routerIp: '172.200.47.193',
      routerMac: '18:E8:29:08:6D:65',
      assignedSubnet: '172.200.47.0/24',
      routerSsid: 'UOS-Physics-52',
    },
    create: {
      roomNumber: '4.1.20',
      building: 'Academic Block (Physics)',
      floor: 1,
      routerName: 'Router 52 (Physics AP - 4.1.20 / 4.1.21)',
      routerIp: '172.200.47.193',
      routerMac: '18:E8:29:08:6D:65',
      assignedSubnet: '172.200.47.0/24',
      routerSsid: 'UOS-Physics-52',
    },
  });

  const room21 = await prisma.room.upsert({
    where: { roomNumber: '4.1.21' },
    update: {
      routerName: 'Router 52 (Physics AP - 4.1.20 / 4.1.21)',
      routerIp: '172.200.47.193',
      routerMac: '18:E8:29:08:6D:65',
      assignedSubnet: '172.200.47.0/24',
      routerSsid: 'UOS-Physics-52',
    },
    create: {
      roomNumber: '4.1.21',
      building: 'Academic Block (Physics)',
      floor: 1,
      routerName: 'Router 52 (Physics AP - 4.1.20 / 4.1.21)',
      routerIp: '172.200.47.193',
      routerMac: '18:E8:29:08:6D:65',
      assignedSubnet: '172.200.47.0/24',
      routerSsid: 'UOS-Physics-52',
    },
  });

  // Router 56: 172.200.37.26 / MAC: 18:e8:29:08:6d:5f (Room 4.1.4)
  const room4 = await prisma.room.upsert({
    where: { roomNumber: '4.1.4' },
    update: {
      routerName: 'Router 56 (Physics AP - 4.1.4)',
      routerIp: '172.200.37.26',
      routerMac: '18:E8:29:08:6D:5F',
      assignedSubnet: '172.200.37.0/24',
      routerSsid: 'UOS-Physics-56',
    },
    create: {
      roomNumber: '4.1.4',
      building: 'Academic Block (Physics)',
      floor: 1,
      routerName: 'Router 56 (Physics AP - 4.1.4)',
      routerIp: '172.200.37.26',
      routerMac: '18:E8:29:08:6D:5F',
      assignedSubnet: '172.200.37.0/24',
      routerSsid: 'UOS-Physics-56',
    },
  });

  console.log('✓ Successfully configured pilot rooms:');
  console.log(`- Room ${room20.roomNumber}: IP ${room20.routerIp} | MAC ${room20.routerMac} | Subnet ${room20.assignedSubnet}`);
  console.log(`- Room ${room21.roomNumber}: IP ${room21.routerIp} | MAC ${room21.routerMac} | Subnet ${room21.assignedSubnet}`);
  console.log(`- Room ${room4.roomNumber}: IP ${room4.routerIp} | MAC ${room4.routerMac} | Subnet ${room4.assignedSubnet}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
