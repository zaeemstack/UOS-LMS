import prisma from '../src/config/db.js';
import bcrypt from 'bcryptjs';

async function main() {
  const defaultPassword = await bcrypt.hash('password123', 10);
  const phyDept = await prisma.department.findUnique({ where: { code: 'PHY' } });

  // Update Dr. M. Asif Nawaz to HOD role
  const asif = await prisma.user.upsert({
    where: { email: 'dr.asif@uosahiwal.edu.pk' },
    update: {
      role: 'HOD',
      fullName: 'Dr. M. Asif Nawaz (HOD Physics)',
      departmentId: phyDept.id,
    },
    create: {
      email: 'dr.asif@uosahiwal.edu.pk',
      passwordHash: defaultPassword,
      fullName: 'Dr. M. Asif Nawaz (HOD Physics)',
      employeeOrRollId: 'EMP-HOD-PHY',
      role: 'HOD',
      departmentId: phyDept.id,
    },
  });

  // Also ensure hod.phy@uosahiwal.edu.pk is Dr. M. Asif Nawaz
  await prisma.user.upsert({
    where: { email: 'hod.phy@uosahiwal.edu.pk' },
    update: {
      role: 'HOD',
      fullName: 'Dr. M. Asif Nawaz (HOD Physics)',
      departmentId: phyDept.id,
    },
    create: {
      email: 'hod.phy@uosahiwal.edu.pk',
      passwordHash: defaultPassword,
      fullName: 'Dr. M. Asif Nawaz (HOD Physics)',
      employeeOrRollId: 'HOD-PHY-ASIF',
      role: 'HOD',
      departmentId: phyDept.id,
    },
  });

  // Clean up old placeholder Dr. Noman Ahmed if exists
  await prisma.user.deleteMany({
    where: {
      email: { in: ['dr.noman@uosahiwal.edu.pk', 'noman@uos.edu.pk'] },
    },
  }).catch(() => {});

  console.log(`✓ Successfully updated Physics HOD to: ${asif.fullName} (${asif.email})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
