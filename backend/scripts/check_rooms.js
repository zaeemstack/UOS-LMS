import prisma from '../src/config/db.js';

async function main() {
  const rooms = await prisma.room.findMany();
  console.log('Total rooms:', rooms.length);
  rooms.forEach((r) => {
    console.log(`${r.roomNumber} | Router: ${r.routerName || 'None'} | IP: ${r.routerIp || 'None'} | Subnet: ${r.assignedSubnet || 'None'}`);
  });
  await prisma.$disconnect();
}

main();
