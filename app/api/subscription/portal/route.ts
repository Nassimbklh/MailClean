import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

/**
 * POST /api/subscription/portal
 *
 * Génère un lien vers le portail client Stripe
 * Permet à l'utilisateur de gérer son abonnement (méthode de paiement, factures, etc.)
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
              in: ['active', 'trialing', 'canceled']
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
        { error: "Aucun abonnement trouvé. Le portail client est disponible uniquement pour les utilisateurs avec un abonnement." },
        { status: 404 }
      );
    }

    const subscription = user.subscriptions[0];

    if (!subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: "ID client Stripe manquant" },
        { status: 400 }
      );
    }

    // Créer une session du portail client
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3300'}/billing`,
    });

    console.log(`✅ [Portal] Session portail créée pour ${user.email}`);

    return NextResponse.json({
      success: true,
      url: portalSession.url
    });
  } catch (error: any) {
    console.error("❌ [Portal] Erreur lors de la création de la session:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session portail", details: error.message },
      { status: 500 }
    );
  }
}
