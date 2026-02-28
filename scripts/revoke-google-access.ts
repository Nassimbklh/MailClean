import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function revokeGoogleAccess() {
  const email = 'nassimb1102@gmail.com'; // Changez par votre email

  console.log(`🔍 Recherche de l'utilisateur ${email}...`);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        googleId: true,
      },
    });

    if (!user) {
      console.log(`❌ Utilisateur ${email} introuvable.`);
      console.log('💡 Connectez-vous d\'abord à l\'application avec ce compte Google.');
      return;
    }

    console.log('✅ Utilisateur trouvé !');
    console.log('');
    console.log('📝 Pour révoquer l\'accès Google, suivez ces étapes :');
    console.log('');
    console.log('1️⃣  Allez sur : https://myaccount.google.com/permissions');
    console.log('');
    console.log('2️⃣  Cherchez "CleanMail" ou "MailClean" dans la liste');
    console.log('');
    console.log('3️⃣  Cliquez dessus, puis cliquez sur "Supprimer l\'accès"');
    console.log('');
    console.log('4️⃣  Redémarrez votre serveur : npm run dev');
    console.log('');
    console.log('5️⃣  Reconnectez-vous à l\'application');
    console.log('');
    console.log('✨ Vous aurez alors les nouvelles permissions !');
    console.log('');
    console.log('📚 Guide complet : Consultez GOOGLE_OAUTH_SETUP.md');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

revokeGoogleAccess();
