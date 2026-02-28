import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

/**
 * POST /api/promo-code/redeem
 * Marque un code promo comme utilisé APRÈS un paiement réussi
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
    });

    if (!promoCode) {
      return NextResponse.json(
        { error: "Code promo invalide" },
        { status: 404 }
      );
    }

    const userEmail = session.user.email;
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Créer l'enregistrement de redemption
    const redemption = await prisma.promoCodeRedemption.create({
      data: {
        promoCodeId: promoCode.id,
        userId: user.id,
        userEmail: user.email,
        planId,
        billing: billingPeriod,
        discountApplied: promoCode.discountPercent,
      },
    });

    // Incrémenter le compteur d'utilisations
    await prisma.promoCode.update({
      where: { id: promoCode.id },
      data: {
        currentUses: {
          increment: 1,
        },
      },
    });

    console.log(`✅ [PromoCode] Code ${code} utilisé par ${userEmail} (${planId} - ${billingPeriod}) - Réduction: ${promoCode.discountPercent}%`);

    return NextResponse.json({
      success: true,
      redemption: {
        code: promoCode.code,
        discountPercent: promoCode.discountPercent,
        planId,
        billing: billingPeriod,
      },
    });
  } catch (error: any) {
    console.error("❌ [PromoCode] Erreur lors de l'utilisation:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
