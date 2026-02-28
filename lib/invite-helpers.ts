import prisma from "@/lib/prisma";

/**
 * Génère un code d'invitation de 10 caractères (A-Z0-9, sans I/O/0/1 pour éviter confusion)
 * Format : XXXXXXXXXX (ex: 7KQ9F2X1AB)
 */
export function generateInviteCode(): string {
  // Caractères autorisés (sans I, O, 0, 1 pour éviter les confusions)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < 10; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }

  return code;
}

/**
 * Génère un code d'invitation unique (vérifie qu'il n'existe pas déjà)
 */
export async function generateUniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  let attempts = 0;
  const maxAttempts = 10;

  // Vérifier que le code n'existe pas déjà
  while (attempts < maxAttempts) {
    const existing = await prisma.inviteCode.findUnique({
      where: { code },
    });

    if (!existing) {
      return code;
    }

    // Code déjà utilisé, générer un nouveau
    code = generateInviteCode();
    attempts++;
  }

  throw new Error('Impossible de générer un code unique après 10 tentatives');
}

/**
 * Valide un code d'invitation
 * Retourne les infos du code + team si valide, sinon erreur
 */
export async function validateInviteCode(code: string) {
  const inviteCode = await prisma.inviteCode.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      team: {
        include: {
          owner: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!inviteCode) {
    return {
      valid: false,
      error: "Code d'invitation invalide",
    };
  }

  // Vérifier si désactivé
  if (inviteCode.disabledAt) {
    return {
      valid: false,
      error: "Ce code d'invitation a été désactivé",
    };
  }

  // Vérifier expiration
  if (new Date() > inviteCode.expiresAt) {
    return {
      valid: false,
      error: "Ce code d'invitation a expiré",
    };
  }

  // Vérifier places disponibles
  if (inviteCode.usedCount >= inviteCode.maxUses) {
    return {
      valid: false,
      error: "Ce code d'invitation a atteint sa limite d'utilisation",
    };
  }

  // Vérifier que l'équipe a encore des places
  if (inviteCode.team.seatsUsed >= inviteCode.team.seatsTotal) {
    return {
      valid: false,
      error: "L'équipe a atteint sa limite de membres",
    };
  }

  return {
    valid: true,
    inviteCode,
    team: inviteCode.team,
  };
}

/**
 * Utilise (redeem) un code d'invitation
 */
export async function redeemInviteCode({
  code,
  userId,
  userEmail,
  ipAddress,
  userAgent,
}: {
  code: string;
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  // Valider le code
  const validation = await validateInviteCode(code);

  if (!validation.valid || !validation.inviteCode || !validation.team) {
    throw new Error(validation.error || "Code invalide");
  }

  const { inviteCode, team } = validation;

  // Vérifier que l'utilisateur n'est pas déjà membre
  const existingMember = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: userId,
      },
    },
  });

  if (existingMember) {
    throw new Error("Vous êtes déjà membre de cette équipe");
  }

  // Vérifier que l'utilisateur n'est pas le owner
  if (team.ownerUserId === userId) {
    throw new Error("Vous êtes déjà propriétaire de cette équipe");
  }

  // Transaction : tout ou rien
  const result = await prisma.$transaction(async (tx) => {
    // 1. Ajouter l'utilisateur à l'équipe
    const teamMember = await tx.teamMember.create({
      data: {
        teamId: team.id,
        userId: userId,
        role: "member",
      },
    });

    // 2. Incrémenter seatsUsed de l'équipe
    await tx.team.update({
      where: { id: team.id },
      data: {
        seatsUsed: {
          increment: 1,
        },
      },
    });

    // 3. Incrémenter usedCount du code
    await tx.inviteCode.update({
      where: { id: inviteCode.id },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });

    // 4. Créer l'enregistrement de redemption
    const redemption = await tx.inviteCodeRedemption.create({
      data: {
        inviteCodeId: inviteCode.id,
        userId: userId,
        userEmail: userEmail,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    // 5. Mettre à jour le plan de l'utilisateur
    await tx.user.update({
      where: { id: userId },
      data: {
        plan: team.plan,
      },
    });

    return { teamMember, redemption };
  });

  console.log(`✅ [invite] Code ${code} utilisé par ${userEmail} pour rejoindre l'équipe ${team.id}`);

  return {
    success: true,
    team,
    ...result,
  };
}
