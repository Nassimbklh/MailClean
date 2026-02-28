import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

/**
 * POST /api/promo-code/validate
 * Valide un code promo AVANT le checkout
 * Body: { code, planId, billingPeriod }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Vérifier que l'utilisateur est connecté
    if (!session.isLoggedIn || !session.user?.email) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const { code, planId, billingPeriod } = await request.json();

    // Validations
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code promo requis" },
        { status: 400 }
      );
    }

    if (!planId || !["solo", "family", "pro"].includes(planId)) {
      return NextResponse.json(
        { error: "Plan invalide" },
        { status: 400 }
      );
    }

    if (!billingPeriod || !["monthly", "yearly"].includes(billingPeriod)) {
      return NextResponse.json(
        { error: "Période de facturation invalide" },
        { status: 400 }
      );
    }

    // Rechercher le code promo
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        redemptions: true,
      },
    });

    if (!promoCode) {
      return NextResponse.json(
        { error: "Code promo invalide" },
        { status: 404 }
      );
    }

    // Vérifier si le code est actif
    if (!promoCode.isActive) {
      return NextResponse.json(
        { error: "Ce code promo n'est plus actif" },
        { status: 400 }
      );
    }

    // Vérifier l'expiration
    if (new Date() > new Date(promoCode.expiresAt)) {
      return NextResponse.json(
        { error: "Ce code promo a expiré" },
        { status: 400 }
      );
    }

    // Vérifier le nombre d'utilisations
    if (promoCode.currentUses >= promoCode.maxUses) {
      return NextResponse.json(
        { error: "Ce code promo a atteint sa limite d'utilisation" },
        { status: 400 }
      );
    }

    // VÉRIFICATION CRITIQUE : Restriction de période de facturation
    if (promoCode.allowedBillingPeriod !== "ALL") {
      const billingPeriodUpper = billingPeriod.toUpperCase();

      if (promoCode.allowedBillingPeriod !== billingPeriodUpper) {
        const periodLabel = promoCode.allowedBillingPeriod === "MONTHLY" ? "mensuels" : "annuels";
        return NextResponse.json(
          {
            error: `Ce code promo est valable uniquement sur les abonnements ${periodLabel}.`,
            allowedBillingPeriod: promoCode.allowedBillingPeriod
          },
          { status: 400 }
        );
      }
    }

    // Vérifier si l'utilisateur a déjà utilisé ce code
    const userEmail = session.user.email;
    const hasUsedCode = promoCode.redemptions.some(r => r.userEmail === userEmail);

    if (hasUsedCode) {
      return NextResponse.json(
        { error: "Vous avez déjà utilisé ce code promo" },
        { status: 400 }
      );
    }

    console.log(`✅ [PromoCode] Code ${code} validé pour ${userEmail} (${planId} - ${billingPeriod})`);

    // Retourner les infos du code promo validé
    return NextResponse.json({
      success: true,
      valid: true,
      promoCode: {
        code: promoCode.code,
        discountPercent: promoCode.discountPercent,
        allowedBillingPeriod: promoCode.allowedBillingPeriod,
        expiresAt: promoCode.expiresAt,
      },
    });
  } catch (error: any) {
    console.error("❌ [PromoCode] Erreur lors de la validation:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
