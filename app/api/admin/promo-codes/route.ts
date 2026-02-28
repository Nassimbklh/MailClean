import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/promo-codes
 * Liste tous les codes promo
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    // Vérifier que l'utilisateur est admin
    if (!session.isLoggedIn || !session.user?.email) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        { error: "Accès admin requis" },
        { status: 403 }
      );
    }

    // Récupérer tous les codes promo avec leurs stats
    const promoCodes = await prisma.promoCode.findMany({
      include: {
        redemptions: {
          select: {
            id: true,
            userEmail: true,
            planId: true,
            billing: true,
            redeemedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      promoCodes,
    });
  } catch (error: any) {
    console.error("❌ [Admin] Erreur lors de la récupération des codes promo:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/promo-codes
 * Créer un nouveau code promo
 * Body: { code, discountPercent, maxUses, expiresInDays, allowedBillingPeriod }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Vérifier que l'utilisateur est admin
    if (!session.isLoggedIn || !session.user?.email) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        { error: "Accès admin requis" },
        { status: 403 }
      );
    }

    const { code, discountPercent, maxUses, expiresInDays, allowedBillingPeriod } = await request.json();

    // Validations
    if (!code || typeof code !== "string" || code.length < 3) {
      return NextResponse.json(
        { error: "Code invalide (minimum 3 caractères)" },
        { status: 400 }
      );
    }

    if (!discountPercent || discountPercent < 1 || discountPercent > 100) {
      return NextResponse.json(
        { error: "Pourcentage de réduction invalide (1-100)" },
        { status: 400 }
      );
    }

    if (!maxUses || maxUses < 1) {
      return NextResponse.json(
        { error: "Nombre max d'utilisations invalide" },
        { status: 400 }
      );
    }

    if (!expiresInDays || expiresInDays < 1) {
      return NextResponse.json(
        { error: "Durée d'expiration invalide" },
        { status: 400 }
      );
    }

    const validBillingPeriods = ["MONTHLY", "YEARLY", "ALL"];
    if (!allowedBillingPeriod || !validBillingPeriods.includes(allowedBillingPeriod)) {
      return NextResponse.json(
        { error: "Période de facturation invalide (MONTHLY, YEARLY, ou ALL)" },
        { status: 400 }
      );
    }

    // Vérifier si le code existe déjà
    const existingCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: "Ce code promo existe déjà" },
        { status: 409 }
      );
    }

    // Calculer la date d'expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Créer le code promo
    const promoCode = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        discountPercent,
        maxUses,
        expiresAt,
        allowedBillingPeriod,
        createdBy: adminUser.email,
      },
    });

    // Logger l'action admin
    await prisma.adminLog.create({
      data: {
        adminEmail: adminUser.email,
        action: "create_promo_code",
        targetType: "promo_code",
        targetId: promoCode.id,
        details: JSON.stringify({
          code: promoCode.code,
          discountPercent,
          maxUses,
          expiresInDays,
          allowedBillingPeriod,
        }),
      },
    });

    console.log(`✅ [Admin] Code promo créé: ${promoCode.code} par ${adminUser.email}`);

    return NextResponse.json({
      success: true,
      promoCode,
    });
  } catch (error: any) {
    console.error("❌ [Admin] Erreur lors de la création du code promo:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/promo-codes?id=xxx
 * Désactiver un code promo
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    // Vérifier que l'utilisateur est admin
    if (!session.isLoggedIn || !session.user?.email) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        { error: "Accès admin requis" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const promoCodeId = searchParams.get("id");

    if (!promoCodeId) {
      return NextResponse.json(
        { error: "ID du code promo requis" },
        { status: 400 }
      );
    }

    // Désactiver le code promo (soft delete)
    const promoCode = await prisma.promoCode.update({
      where: { id: promoCodeId },
      data: { isActive: false },
    });

    // Logger l'action admin
    await prisma.adminLog.create({
      data: {
        adminEmail: adminUser.email,
        action: "deactivate_promo_code",
        targetType: "promo_code",
        targetId: promoCode.id,
        details: JSON.stringify({
          code: promoCode.code,
        }),
      },
    });

    console.log(`✅ [Admin] Code promo désactivé: ${promoCode.code} par ${adminUser.email}`);

    return NextResponse.json({
      success: true,
      message: `Code promo ${promoCode.code} désactivé`,
    });
  } catch (error: any) {
    console.error("❌ [Admin] Erreur lors de la désactivation du code promo:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
