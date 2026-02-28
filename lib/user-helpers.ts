import prisma from "@/lib/prisma";

/**
 * Récupère ou crée un utilisateur dans la base de données
 * basé sur l'email de la session
 */
export async function getOrCreateUser(email: string, googleId?: string, name?: string, picture?: string) {
  let user = await prisma.user.findUnique({
    where: { email },
    include: {
      userMetrics: true,
    },
  });

  if (!user) {
    // Créer l'utilisateur et ses métriques
    user = await prisma.user.create({
      data: {
        email,
        googleId,
        name,
        picture,
        userMetrics: {
          create: {
            totalDeleted: 0,
            totalUnsubscribes: 0,
          },
        },
      },
      include: {
        userMetrics: true,
      },
    });
  } else if (googleId && user.googleId !== googleId) {
    // Mettre à jour le googleId si manquant
    user = await prisma.user.update({
      where: { email },
      data: { googleId, name, picture },
      include: {
        userMetrics: true,
      },
    });
  }

  return user;
}

/**
 * Récupère l'utilisateur par email
 */
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      userMetrics: true,
      scanState: true,
    },
  });
}
