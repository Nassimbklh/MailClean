import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getOrCreateUser({
  email,
  googleId,
  name,
  picture,
}: {
  email: string;
  googleId?: string;
  name?: string;
  picture?: string;
}) {
  let user = await prisma.user.findUnique({
    where: { email },
    include: {
      userMetrics: true,
    },
  });

  const isNewUser = !user;

  if (!user) {
    // Créer l'utilisateur
    user = await prisma.user.create({
      data: {
        email,
        googleId,
        name,
        picture,
        firstLoginAt: new Date(), // Première connexion
      },
      include: {
        userMetrics: true,
      },
    });

    // Créer UserMetrics
    if (!user.userMetrics) {
      await prisma.userMetrics.create({
        data: {
          userId: user.id,
        },
      });
    }
  } else {
    // Mettre à jour lastLogin
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        // Mettre à jour googleId si pas déjà set
        ...(googleId && !user.googleId ? { googleId } : {}),
        // Mettre à jour name/picture si fourni
        ...(name ? { name } : {}),
        ...(picture ? { picture } : {}),
      },
      include: {
        userMetrics: true,
      },
    });
  }

  return { user, isNewUser };
}
