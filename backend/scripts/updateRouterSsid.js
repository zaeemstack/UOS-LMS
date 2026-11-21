import prisma from '../src/config/db.js';

async function main() {
  await prisma.room.updateMany({ where: { roomNumber: { in: ['4.1.20', '4.1.21'] } }, data: { routerName: 'Campus-Wifi (Router 52)', routerSsid: 'Campus-Wifi' } });
  await prisma.room.updateMany({ where: { roomNumber: '4.1.4' }, data: { routerName: 'Campus-Wifi (Router 56)', routerSsid: 'Campus-Wifi' } });
  await prisma.room.updateMany({ where: { roomNumber: { in: ['1.1.17', '4.1.17'] } }, data: { routerName: 'Campus-Wifi (Physics Lab)', routerSsid: 'Campus-Wifi' } });
  await prisma.room.updateMany({ where: { roomNumber: '4.G.6-A' }, data: { routerName: 'Campus-Wifi (Ground Floor)', routerSsid: 'Campus-Wifi' } });

  const updatedRooms = await prisma.room.findMany();
  console.log('Cleaned room router names:');
  updatedRooms.forEach(r => {
    console.log(`- Room ${r.roomNumber}: SSID "${r.routerSsid}" | Name "${r.routerName}" | IP ${r.routerIp}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
