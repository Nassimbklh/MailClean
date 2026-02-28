import { PrismaClient } from "@prisma/client";
import { getSession } from "./session";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

/**
 * Récupère la liste des emails admin depuis les variables d'environnement
 */
export function getAdminEmails(): string[] {
  const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
  return adminEmailsEnv
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

/**
 * Vérifie si un email fait partie des administrateurs
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Vérifie si l'utilisateur connecté est un admin
 * Retourne l'utilisateur si admin, sinon null
 */
export async function verifyAdminSession() {
  try {
    const session = await getSession();

    // Vérifier si l'utilisateur est connecté
    if (!session.isLoggedIn || !session.user?.email) {
      return null;
    }

    const userEmail = session.user.email;

    // Vérifier si l'email est dans la liste des admins
    if (!isAdminEmail(userEmail)) {
      return null;
    }

    // Récupérer l'utilisateur depuis la base de données
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        subscription: true,
        userMetrics: true,
        scanState: true,
      },
    });

    if (!user) {
      return null;
    }

    // Vérifier que le rôle est bien admin
    if (user.role !== "admin") {
      // Mettre à jour le rôle si l'email est dans ADMIN_EMAILS
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "admin" },
      });
      user.role = "admin";
    }

    // Vérifier que le compte n'est pas suspendu
    if (!user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error verifying admin session:", error);
    return null;
  }
}

/**
 * Middleware pour protéger les routes admin
 * À utiliser dans les API routes
 */
export async function requireAdmin() {
  const admin = await verifyAdminSession();

  if (!admin) {
    return {
      authorized: false,
      error: "Unauthorized - Admin access required",
      status: 403,
    };
  }

  return {
    authorized: true,
    admin,
  };
}

/**
 * Log une action d'administration
 */
export async function logAdminAction({
  adminEmail,
  action,
  targetType,
  targetId,
  details,
  request,
}: {
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: any;
  request?: NextRequest;
}) {
  try {
    const ipAddress = request?.headers.get("x-forwarded-for") || request?.headers.get("x-real-ip") || "unknown";
    const userAgent = request?.headers.get("user-agent") || "unknown";

    await prisma.adminLog.create({
      data: {
        adminEmail,
        action,
        targetType,
        targetId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Error logging admin action:", error);
  }
}

/**
 * Récupère les statistiques globales de la plateforme
 */
export async function getPlatformStats() {
  try {
    const [
      totalUsers,
      activeUsers,
      activeSubscriptions,
      freeUsers,
      totalEmailsAnalyzed,
      recentUsers,
    ] = await Promise.all([
      // Total d'utilisateurs
      prisma.user.count(),

      // Utilisateurs actifs (connectés dans les 30 derniers jours)
      prisma.user.count({
        where: {
          lastLogin: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Abonnements actifs
      prisma.subscription.count({
        where: {
          status: "active",
        },
      }),

      // Utilisateurs en plan gratuit
      prisma.user.count({
        where: {
          plan: "free",
        },
      }),

      // Total d'emails analysés (somme de totalDeleted de tous les users)
      prisma.userMetrics.aggregate({
        _sum: {
          totalDeleted: true,
        },
      }),

      // Dernières inscriptions (10 dernières)
      prisma.user.findMany({
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          createdAt: true,
          lastLogin: true,
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      activeSubscriptions,
      freeUsers,
      totalEmailsAnalyzed: totalEmailsAnalyzed._sum.totalDeleted || 0,
      recentUsers,
    };
  } catch (error) {
    console.error("Error getting platform stats:", error);
    throw error;
  }
}

/**
 * Récupère tous les utilisateurs avec pagination et filtres
 */
export async function getAllUsers({
  page = 1,
  limit = 20,
  search,
  plan,
  isActive,
}: {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  isActive?: boolean;
}) {
  try {
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }

    if (plan) {
      where.plan = plan;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          subscription: true,
          userMetrics: true,
          scanState: true,
          _count: {
            select: {
              senderStats: true,
              activityLogs: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
}

/**
 * Récupère les détails complets d'un utilisateur
 */
export async function getUserDetails(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        userMetrics: true,
        scanState: true,
        activityLogs: {
          orderBy: {
            timestamp: "desc",
          },
          take: 50,
        },
        _count: {
          select: {
            senderStats: true,
            activityLogs: true,
          },
        },
      },
    });

    return user;
  } catch (error) {
    console.error("Error getting user details:", error);
    throw error;
  }
}

/**
 * Suspend ou réactive un utilisateur
 */
export async function toggleUserActiveStatus(userId: string, isActive: boolean) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    return user;
  } catch (error) {
    console.error("Error toggling user active status:", error);
    throw error;
  }
}

/**
 * Change le plan d'un utilisateur
 */
export async function updateUserPlan(userId: string, plan: string, options?: { quantity?: number; billing?: string }) {
  try {
    // Mettre à jour le plan de l'utilisateur
    const user = await prisma.user.update({
      where: { id: userId },
      data: { plan },
      include: {
        subscription: true,
      },
    });

    console.log(`🔧 [admin] Plan changé pour ${user.email}: ${plan}`);

    // Mettre à jour ou créer la subscription
    if (plan === "free") {
      // Si passage en FREE, désactiver la subscription existante
      if (user.subscription) {
        await prisma.subscription.update({
          where: { id: user.subscription.id },
          data: {
            status: "canceled",
            canceledAt: new Date(),
          },
        });
        console.log(`🔧 [admin] Subscription désactivée pour ${user.email}`);
      }
    } else {
      // Si passage en plan payant, créer/mettre à jour la subscription
      const quantity = options?.quantity || (plan === "pro" ? 10 : plan === "family" ? 5 : 1);
      const billing = options?.billing || "monthly";

      const subscriptionData = {
        planId: plan,
        billing,
        quantity,
        status: "manual" as const, // Status spécial pour les changements manuels
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // +1 an par défaut
      };

      if (user.subscription) {
        await prisma.subscription.update({
          where: { id: user.subscription.id },
          data: subscriptionData,
        });
        console.log(`🔧 [admin] Subscription mise à jour pour ${user.email}: ${plan} (${quantity} seats)`);
      } else {
        await prisma.subscription.create({
          data: {
            ...subscriptionData,
            userId: user.id,
          },
        });
        console.log(`🔧 [admin] Subscription créée pour ${user.email}: ${plan} (${quantity} seats)`);
      }
    }

    // Recharger l'utilisateur avec sa subscription mise à jour
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    });

    return updatedUser;
  } catch (error) {
    console.error("Error updating user plan:", error);
    throw error;
  }
}

/**
 * Supprime un utilisateur et toutes ses données
 */
export async function deleteUser(userId: string) {
  try {
    // Grâce au onDelete: Cascade, toutes les relations seront supprimées automatiquement
    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

/**
 * Récupère tous les abonnements avec pagination
 */
export async function getAllSubscriptions({
  page = 1,
  limit = 20,
  status,
}: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  try {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error getting all subscriptions:", error);
    throw error;
  }
}

/**
 * Récupère les logs d'administration avec pagination
 */
export async function getAdminLogs({
  page = 1,
  limit = 50,
  startDate,
  endDate,
  action,
  adminEmail,
}: {
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  action?: string;
  adminEmail?: string;
}) {
  try {
    const where: any = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    if (action) {
      where.action = action;
    }

    if (adminEmail) {
      where.adminEmail = adminEmail;
    }

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          timestamp: "desc",
        },
      }),
      prisma.adminLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error getting admin logs:", error);
    throw error;
  }
}
