import prisma from '../src/config/db.js';

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, fullName: true, role: true, employeeOrRollId: true } });
  console.log('Users in DB:');
  users.forEach(u => console.log(`- ${u.role}: ${u.fullName} (${u.email}) [ID: ${u.employeeOrRollId}]`));

  const rooms = await prisma.room.findMany();
  console.log('\nRooms in DB:');
  rooms.forEach(r => console.log(`- Room ${r.roomNumber}: IP ${r.routerIp} | MAC ${r.routerMac} | Subnet ${r.assignedSubnet} | ${r.routerName}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
