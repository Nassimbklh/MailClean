import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

/**
 * POST /api/subscription/cancel
 *
 * Annule l'abonnement de l'utilisateur
 * L'abonnement reste actif jusqu'à la fin de la période de facturation
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
            status: {
              in: ['active', 'trialing']
            }
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
        { error: "Aucun abonnement actif trouvé" },
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

    // Annuler l'abonnement sur Stripe (à la fin de la période)
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
        metadata: {
          canceledBy: 'user',
          canceledAt: new Date().toISOString()
        }
      }
    );

    // Mettre à jour l'abonnement dans la base de données
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        canceledAt: new Date(),
        status: 'canceled' // Sera mis à jour par le webhook quand réellement terminé
      }
    });

    // Mettre à jour le plan de l'utilisateur (sera rétrogradé à free à la fin de la période)
    console.log(`✅ [Subscription] Abonnement annulé pour ${user.email}, actif jusqu'au ${new Date((canceledSubscription as any).current_period_end * 1000).toLocaleDateString('fr-FR')}`);

    return NextResponse.json({
      success: true,
      message: "Abonnement annulé avec succès",
      cancelAt: (canceledSubscription as any).current_period_end,
      cancelAtDate: new Date((canceledSubscription as any).current_period_end * 1000).toISOString()
    });
  } catch (error: any) {
    console.error("❌ [Subscription] Erreur lors de l'annulation:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'annulation de l'abonnement", details: error.message },
      { status: 500 }
    );
  }
}
