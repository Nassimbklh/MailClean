import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

/**
 * POST /api/subscription/reactivate
 *
 * Réactive un abonnement annulé (avant la fin de la période)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user?.email) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur et son abonnement
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscriptions: {
          where: {
            status: 'canceled'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    if (!user.subscriptions || user.subscriptions.length === 0) {
      return NextResponse.json(
        { error: "Aucun abonnement annulé trouvé" },
        { status: 404 }
      );
    }

    const subscription = user.subscriptions[0];

    if (!subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "ID d'abonnement Stripe manquant" },
        { status: 400 }
      );
    }

    // Réactiver l'abonnement sur Stripe
    const reactivatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
        metadata: {
          reactivatedBy: 'user',
          reactivatedAt: new Date().toISOString()
        }
      }
    );

    // Mettre à jour l'abonnement dans la base de données
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        canceledAt: null,
        status: reactivatedSubscription.status === 'active' ? 'active' : 'trialing'
      }
    });

    console.log(`✅ [Subscription] Abonnement réactivé pour ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Abonnement réactivé avec succès",
      subscription: {
        id: reactivatedSubscription.id,
        status: reactivatedSubscription.status,
        currentPeriodEnd: (reactivatedSubscription as any).current_period_end
      }
    });
  } catch (error: any) {
    console.error("❌ [Subscription] Erreur lors de la réactivation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réactivation de l'abonnement", details: error.message },
      { status: 500 }
    );
  }
}
