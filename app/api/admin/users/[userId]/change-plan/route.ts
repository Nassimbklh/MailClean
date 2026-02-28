import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdminAuth } from "@/lib/admin-helpers";

/**
 * POST /api/admin/users/[userId]/change-plan
 *
 * Change le plan d'un utilisateur manuellement (admin only)
 *
 * Body:
 * - newPlan: "free" | "solo" | "family" | "pro"
 * - quantity?: number (pour le plan Pro)
 * - billing?: "monthly" | "yearly"
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Vérifier que l'utilisateur est admin
    const authCheck = await checkAdminAuth();

    if (!authCheck.isAdmin || !authCheck.admin) {
      return NextResponse.json(
        { error: "Accès refusé. Admin uniquement." },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const body = await request.json();
    const { newPlan, quantity, billing } = body;

    if (!newPlan || !["free", "solo", "family", "pro"].includes(newPlan)) {
      return NextResponse.json(
        { error: "Plan invalide. Doit être : free, solo, family ou pro" },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const oldPlan = user.plan;

    // Mettre à jour le plan de l'utilisateur
    await prisma.user.update({
      where: { id: userId },
      data: { plan: newPlan },
    });

    console.log(`🔧 [admin/change-plan] Plan changé pour ${user.email}: ${oldPlan} → ${newPlan}`);

    // Mettre à jour ou créer la subscription
    if (newPlan === "free") {
      // Si passage en FREE, désactiver la subscription existante
      if (user.subscription) {
        await prisma.subscription.update({
          where: { id: user.subscription.id },
          data: {
            status: "canceled",
            canceledAt: new Date(),
          },
        });
        console.log(`🔧 [admin/change-plan] Subscription désactivée pour ${user.email}`);
      }
    } else {
      // Si passage en plan payant, créer/mettre à jour la subscription
      const subscriptionData = {
        planId: newPlan,
        billing: billing || "monthly",
        quantity: quantity || (newPlan === "pro" ? 10 : 1),
        status: "manual" as const, // Status spécial pour les changements manuels
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // +1 an par défaut
      };

      if (user.subscription) {
        await prisma.subscription.update({
          where: { id: user.subscription.id },
          data: subscriptionData,
        });
        console.log(`🔧 [admin/change-plan] Subscription mise à jour pour ${user.email}`);
      } else {
        await prisma.subscription.create({
          data: {
            ...subscriptionData,
            userId: user.id,
          },
        });
        console.log(`🔧 [admin/change-plan] Subscription créée pour ${user.email}`);
      }
    }

    // Logger l'action dans AdminLog
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    await prisma.adminLog.create({
      data: {
        adminEmail: authCheck.admin.email,
        action: "change_plan",
        targetType: "user",
        targetId: userId,
        details: JSON.stringify({
          oldPlan,
          newPlan,
          quantity,
          billing,
          userEmail: user.email,
        }),
        ipAddress,
        userAgent,
      },
    });

    console.log(`✅ [admin/change-plan] Action loggée: ${authCheck.admin.email} a changé le plan de ${user.email}`);

    return NextResponse.json({
      success: true,
      message: `Plan changé avec succès : ${oldPlan} → ${newPlan}`,
      user: {
        id: user.id,
        email: user.email,
        plan: newPlan,
      },
    });
  } catch (error: any) {
    console.error("❌ [admin/change-plan] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors du changement de plan",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
