import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

/**
 * POST /api/stripe/portal
 *
 * Crée une session Stripe Customer Portal pour gérer l'abonnement
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur et sa subscription
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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

    // Vérifier que l'utilisateur a un abonnement avec un customer Stripe
    if (!user.subscription?.stripeCustomerId) {
      return NextResponse.json(
        {
          error: "Aucun abonnement Stripe trouvé",
        },
        { status: 400 }
      );
    }

    // Créer une session Customer Portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/billing`,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error: any) {
    console.error("❌ [stripe/portal] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la création de la session portal",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
