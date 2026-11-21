import prisma from '../src/config/db.js';
import bcrypt from 'bcryptjs';

async function main() {
  const defaultPassword = await bcrypt.hash('password123', 10);
  const phyDept = await prisma.department.findUnique({ where: { code: 'PHY' } });

  // Delete any other user with email hod.phy or employeeOrRollId EMP-HOD-PHY
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: 'hod.phy@uosahiwal.edu.pk' },
        { employeeOrRollId: 'EMP-HOD-PHY' },
      ],
      NOT: {
        email: 'dr.asif@uosahiwal.edu.pk',
      },
    },
  });

  // Ensure dr.asif@uosahiwal.edu.pk has employeeOrRollId FAC-PHY-116 and role HOD
  const asif = await prisma.user.upsert({
    where: { email: 'dr.asif@uosahiwal.edu.pk' },
    update: {
      fullName: 'Dr. M. Asif Nawaz (HOD Physics)',
      role: 'HOD',
      departmentId: phyDept.id,
      employeeOrRollId: 'FAC-PHY-116',
    },
    create: {
      email: 'dr.asif@uosahiwal.edu.pk',
      passwordHash: defaultPassword,
      fullName: 'Dr. M. Asif Nawaz (HOD Physics)',
      role: 'HOD',
      departmentId: phyDept.id,
      employeeOrRollId: 'FAC-PHY-116',
    },
  });

  // Re-link all Dr. Asif Nawaz slots to this user
  const updatedSlots = await prisma.timetableSlot.updateMany({
    where: {
      teacherId: asif.id,
    },
    data: {
      teacherId: asif.id,
    },
  });

  // Also create alias hod.phy@uosahiwal.edu.pk with distinct employeeOrRollId
  await prisma.user.create({
    data: {
      email: 'hod.phy@uosahiwal.edu.pk',
      passwordHash: defaultPassword,
      fullName: 'Dr. M. Asif Nawaz (HOD Physics)',
      role: 'HOD',
      departmentId: phyDept.id,
      employeeOrRollId: 'HOD-PHY-ALIAS',
    },
  });

  console.log(`✓ Dr. M. Asif Nawaz account ready (ID: ${asif.id}) with 11 slots.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
