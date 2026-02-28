import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  const email = 'nassimb1102@gmail.com';

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      console.log(`❌ Utilisateur ${email} introuvable.`);
      return;
    }

    console.log('✅ Utilisateur trouvé :');
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Nom: ${user.name || 'N/A'}`);
    console.log(`💎 Plan: ${user.plan}`);
    console.log(`👑 Rôle: ${user.role}`);
    console.log(`✨ Actif: ${user.isActive ? 'Oui' : 'Non'}`);
    console.log(`🆔 ID: ${user.id}`);
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
