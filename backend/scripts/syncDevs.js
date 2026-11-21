import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const dept = await prisma.department.findFirst();
  const hashZaeem = await bcrypt.hash('zaeem123', 10);
  const hashSaif = await bcrypt.hash('saif123', 10);

  // Muhammad Zaeem
  const zaeem = await prisma.user.upsert({
    where: { email: 'zaeem@uosahiwal.edu.pk' },
    update: {
      fullName: 'Muhammad Zaeem',
      employeeOrRollId: 'zaeem',
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email: 'zaeem@uosahiwal.edu.pk',
      fullName: 'Muhammad Zaeem',
      employeeOrRollId: 'zaeem',
      role: 'ADMIN',
      departmentId: dept?.id || null,
      passwordHash: hashZaeem,
      isActive: true,
      mustChangePassword: false,
    },
  });

  // Muhammad Saif Ullah
  const saif = await prisma.user.upsert({
    where: { email: 'saif@uosahiwal.edu.pk' },
    update: {
      fullName: 'Muhammad Saif Ullah',
      employeeOrRollId: 'saif',
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email: 'saif@uosahiwal.edu.pk',
      fullName: 'Muhammad Saif Ullah',
      employeeOrRollId: 'saif',
      role: 'ADMIN',
      departmentId: dept?.id || null,
      passwordHash: hashSaif,
      isActive: true,
      mustChangePassword: false,
    },
  });

  console.log('✓ Successfully synced developer admin accounts:');
  console.log(`1. ${zaeem.fullName} (${zaeem.email}) - ID: ${zaeem.employeeOrRollId}`);
  console.log(`2. ${saif.fullName} (${saif.email}) - ID: ${saif.employeeOrRollId}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
