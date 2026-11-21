import prisma from '../src/config/db.js';

async function main() {
  const updates = [
    { roomNumber: '4.1.20', routerName: 'Router 52 (Physics AP - 4.1.20)', routerIp: '172.200.47.193', routerMac: '18:E8:29:08:6D:65', assignedSubnet: '172.200.47.0/24, 172.200.62.0/24' },
    { roomNumber: '4.1.21', routerName: 'Router 52 (Physics AP - 4.1.21)', routerIp: '172.200.47.193', routerMac: '18:E8:29:08:6D:65', assignedSubnet: '172.200.47.0/24, 172.200.62.0/24' },
    { roomNumber: '4.1.4', routerName: 'Router 56 (Physics AP - 4.1.4)', routerIp: '172.200.37.26', routerMac: '18:E8:29:08:6D:5F', assignedSubnet: '172.200.37.0/24, 172.200.62.0/24' },
    { roomNumber: '4.1.17', routerName: 'Router 52 (Physics Lab-A)', routerIp: '172.200.47.1', routerMac: '18:E8:29:08:6D:65', assignedSubnet: '172.200.47.0/24, 172.200.62.0/24' },
    { roomNumber: '1.1.17', routerName: 'Router 52 (Physics Lab-B)', routerIp: '172.200.47.1', routerMac: '18:E8:29:08:6D:65', assignedSubnet: '172.200.47.0/24, 172.200.62.0/24' },
    { roomNumber: '4.G.6-A', routerName: 'Campus-Wifi (Ground Floor)', routerIp: '172.200.37.1', routerMac: '18:E8:29:08:6D:5F', assignedSubnet: '172.200.37.0/24, 172.200.62.0/24' },
  ];

  for (const item of updates) {
    const existing = await prisma.room.findUnique({ where: { roomNumber: item.roomNumber } });
    if (existing) {
      await prisma.room.update({
        where: { roomNumber: item.roomNumber },
        data: {
          routerName: item.routerName,
          routerIp: item.routerIp,
          routerMac: item.routerMac,
          assignedSubnet: item.assignedSubnet,
        },
      });
      console.log(`Updated room ${item.roomNumber}`);
    }
  }

  const all = await prisma.room.findMany();
  console.log('\nVerified All Rooms in DB:');
  all.forEach((r) => {
    console.log(`${r.roomNumber} -> Router: ${r.routerName} | IP: ${r.routerIp} | Subnet: ${r.assignedSubnet}`);
  });

  await prisma.$disconnect();
}

main();
