import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Incrémente le compteur de statistiques pour un utilisateur
 */
export async function incrementUserStats(
  userEmail: string,
  type: 'deleted' | 'archived' | 'unsubscribed',
  count: number = 1
) {
  try {
    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { userMetrics: true },
    });

    if (!user) {
      console.error(`[Stats] Utilisateur non trouvé: ${userEmail}`);
      return;
    }

    // Créer UserMetrics si n'existe pas
    if (!user.userMetrics) {
      await prisma.userMetrics.create({
        data: {
          userId: user.id,
        },
      });
    }

    // Incrémenter le compteur approprié
    const updateData: any = {};

    switch (type) {
      case 'deleted':
        updateData.totalDeleted = { increment: count };
        break;
      case 'archived':
        updateData.totalArchived = { increment: count };
        break;
      case 'unsubscribed':
        updateData.totalUnsubscribes = { increment: count };
        break;
    }

    await prisma.userMetrics.updateMany({
      where: { userId: user.id },
      data: updateData,
    });

    console.log(`✅ [Stats] ${type} +${count} pour ${userEmail}`);

    // Créer une entrée UserAction pour l'historique
    await prisma.userAction.create({
      data: {
        userId: user.id,
        actionType: type,
        count: count,
      },
    });
  } catch (error) {
    console.error(`❌ [Stats] Erreur lors de l'incrémentation pour ${userEmail}:`, error);
    // Ne pas propager l'erreur pour ne pas bloquer l'action principale
  }
}
