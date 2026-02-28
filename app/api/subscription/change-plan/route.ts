import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

/**
 * POST /api/subscription/change-plan
 *
 * Change le plan d'abonnement de l'utilisateur
 * Body: { newPlan: 'solo' | 'family', billing: 'monthly' | 'yearly' }
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

    const { newPlan, billing } = await request.json();

    // Validation
    if (!newPlan || !billing) {
      return NextResponse.json(
        { error: "Plan et mode de facturation requis" },
        { status: 400 }
      );
    }

    if (!['solo', 'family'].includes(newPlan)) {
      return NextResponse.json(
        { error: "Plan invalide. Doit être 'solo' ou 'family'" },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billing)) {
      return NextResponse.json(
        { error: "Mode de facturation invalide. Doit être 'monthly' ou 'yearly'" },
        { status: 400 }
      );
    }

    // Récupérer le price ID correspondant
    let newPriceId: string | undefined;
    if (newPlan === 'solo' && billing === 'monthly') {
      newPriceId = process.env.STRIPE_PRICE_ID_SOLO_MONTHLY;
    } else if (newPlan === 'solo' && billing === 'yearly') {
      newPriceId = process.env.STRIPE_PRICE_ID_SOLO_YEARLY;
    } else if (newPlan === 'family' && billing === 'monthly') {
      newPriceId = process.env.STRIPE_PRICE_ID_FAMILY_MONTHLY;
    } else if (newPlan === 'family' && billing === 'yearly') {
      newPriceId = process.env.STRIPE_PRICE_ID_FAMILY_YEARLY;
    }

    if (!newPriceId) {
      return NextResponse.json(
        { error: "Price ID non configuré pour ce plan" },
        { status: 500 }
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
        { error: "Aucun abonnement actif trouvé. Veuillez d'abord créer un abonnement." },
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

    // Récupérer l'abonnement Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    // Mettre à jour l'abonnement avec le nouveau prix
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations', // Créer des prorations pour ajuster le montant
        metadata: {
          plan: newPlan,
          billing: billing,
          changedAt: new Date().toISOString()
        }
      }
    );

    // Mettre à jour l'abonnement dans la base de données
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: newPlan,
        billing: billing,
      }
    });

    // Mettre à jour le plan de l'utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: newPlan === 'solo' ? 'pro' : 'family' // Mapper le plan au type User
      }
    });

    console.log(`✅ [Subscription] Plan changé pour ${user.email}: ${newPlan} (${billing})`);

    return NextResponse.json({
      success: true,
      message: "Plan changé avec succès",
      subscription: {
        id: updatedSubscription.id,
        plan: newPlan,
        billing: billing,
        status: updatedSubscription.status,
        currentPeriodEnd: (updatedSubscription as any).current_period_end
      }
    });
  } catch (error: any) {
    console.error("❌ [Subscription] Erreur lors du changement de plan:", error);
    return NextResponse.json(
      { error: "Erreur lors du changement de plan", details: error.message },
      { status: 500 }
    );
  }
}
