import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { sendUnsubscribeConfirmationEmail } from "@/lib/email-service";

/**
 * POST /api/subscription/manage
 *
 * Gérer l'abonnement: annuler ou réactiver
 *
 * Body:
 * - action: "cancel" | "reactivate"
 */
export async function POST(request: NextRequest) {
  console.log("⚙️ [subscription/manage] Début de la requête");

  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (!action || !['cancel', 'reactivate'].includes(action)) {
      return NextResponse.json(
        { error: "Action invalide. Utilisez 'cancel' ou 'reactivate'." },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur depuis la DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    if (!user.subscription) {
      return NextResponse.json(
        { error: "Aucun abonnement trouvé" },
        { status: 404 }
      );
    }

    const subscription = user.subscription;

    if (action === 'cancel') {
      // Annuler l'abonnement à la fin de la période
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: new Date(),
        },
      });

      console.log(`✅ [subscription/manage] Abonnement programmé pour annulation: ${user.email}`);

      // Envoyer l'email de confirmation de désabonnement
      try {
        await sendUnsubscribeConfirmationEmail({
          user: {
            email: user.email,
            name: user.name,
          },
          subscription: {
            planId: updatedSubscription.planId,
            billing: updatedSubscription.billing || 'monthly',
            currentPeriodEnd: updatedSubscription.currentPeriodEnd,
          },
        });
        console.log(`✅ [subscription/manage] Email de confirmation envoyé à: ${user.email}`);
      } catch (emailError) {
        console.error(`❌ [subscription/manage] Erreur lors de l'envoi de l'email:`, emailError);
        // On continue même si l'email échoue
      }

      return NextResponse.json({
        success: true,
        message: "Votre abonnement sera annulé à la fin de la période en cours",
        subscription: {
          cancelAtPeriodEnd: true,
          currentPeriodEnd: updatedSubscription.currentPeriodEnd,
          planId: updatedSubscription.planId,
          billing: updatedSubscription.billing,
        },
      });
    } else if (action === 'reactivate') {
      // Réactiver l'abonnement (annuler l'annulation programmée)
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      });

      console.log(`✅ [subscription/manage] Abonnement réactivé: ${user.email}`);

      return NextResponse.json({
        success: true,
        message: "Votre abonnement a été réactivé avec succès",
        subscription: {
          cancelAtPeriodEnd: false,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
      });
    }

    return NextResponse.json(
      { error: "Action non traitée" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("❌ [subscription/manage] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la gestion de l'abonnement",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
