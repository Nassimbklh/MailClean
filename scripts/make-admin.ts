import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
  const adminEmail = 'nassimb1102@gmail.com';

  try {
    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!user) {
      console.log(`❌ Utilisateur ${adminEmail} introuvable.`);
      console.log('💡 Connectez-vous d\'abord à l\'application avec ce compte Google.');
      return;
    }

    // Mettre à jour le rôle
    const updatedUser = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: 'admin',
        isActive: true,
      },
    });

    console.log('✅ Utilisateur mis à jour avec succès !');
    console.log(`📧 Email: ${updatedUser.email}`);
    console.log(`👑 Rôle: ${updatedUser.role}`);
    console.log(`✨ Status: ${updatedUser.isActive ? 'Actif' : 'Inactif'}`);
    console.log('\n🎉 Vous pouvez maintenant accéder à /admin');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
