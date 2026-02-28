import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { SessionData } from "@/types";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

/**
 * POST /api/stripe/checkout
 *
 * Créer une session Stripe Checkout pour un plan
 *
 * Body params:
 * - planId: "solo" | "family" | "pro"
 * - billing: "monthly" | "yearly"
 * - accountCount: number (uniquement pour le plan Pro)
 * - promoCode: string (optionnel)
 */
export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { planId, billing, accountCount, promoCode } = body;

    if (!planId || !billing) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur depuis la DB pour avoir son ID
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Validation du code promo si fourni
    let validatedPromoCode: any = null;
    let stripeCouponId: string | null = null;

    if (promoCode) {
      // Rechercher le code promo en base
      const dbPromoCode = await prisma.promoCode.findUnique({
        where: { code: promoCode.toUpperCase() },
        include: {
          redemptions: true,
        },
      });

      if (!dbPromoCode) {
        return NextResponse.json(
          { error: "Code promo invalide" },
          { status: 400 }
        );
      }

      // Vérifications
      if (!dbPromoCode.isActive) {
        return NextResponse.json(
          { error: "Ce code promo n'est plus actif" },
          { status: 400 }
        );
      }

      if (new Date() > new Date(dbPromoCode.expiresAt)) {
        return NextResponse.json(
          { error: "Ce code promo a expiré" },
          { status: 400 }
        );
      }

      if (dbPromoCode.currentUses >= dbPromoCode.maxUses) {
        return NextResponse.json(
          { error: "Ce code promo a atteint sa limite d'utilisation" },
          { status: 400 }
        );
      }

      // VÉRIFICATION CRITIQUE : Restriction de période de facturation
      if (dbPromoCode.allowedBillingPeriod !== "ALL") {
        const billingPeriodUpper = billing.toUpperCase();

        if (dbPromoCode.allowedBillingPeriod !== billingPeriodUpper) {
          const periodLabel = dbPromoCode.allowedBillingPeriod === "MONTHLY" ? "mensuels" : "annuels";
          return NextResponse.json(
            {
              error: `Ce code promo est valable uniquement sur les abonnements ${periodLabel}.`,
            },
            { status: 400 }
          );
        }
      }

      // Vérifier si l'utilisateur a déjà utilisé ce code
      const hasUsedCode = dbPromoCode.redemptions.some(r => r.userEmail === session.user!.email);

      if (hasUsedCode) {
        return NextResponse.json(
          { error: "Vous avez déjà utilisé ce code promo" },
          { status: 400 }
        );
      }

      // Créer ou récupérer le coupon Stripe
      try {
        // Chercher si un coupon existe déjà pour ce code
        const existingCoupons = await stripe.coupons.list({ limit: 100 });
        const existingCoupon = existingCoupons.data.find(c => c.metadata?.promoCodeId === dbPromoCode.id);

        if (existingCoupon) {
          stripeCouponId = existingCoupon.id;
        } else {
          // Créer un nouveau coupon Stripe
          const stripeCoupon = await stripe.coupons.create({
            percent_off: dbPromoCode.discountPercent,
            duration: "once", // Appliqué une seule fois
            name: `Code promo ${dbPromoCode.code}`,
            metadata: {
              promoCodeId: dbPromoCode.id,
              promoCode: dbPromoCode.code,
            },
          });
          stripeCouponId = stripeCoupon.id;
        }

        validatedPromoCode = dbPromoCode;
        console.log(`✅ [Stripe] Code promo ${promoCode} validé et coupon Stripe créé: ${stripeCouponId}`);
      } catch (error: any) {
        console.error("❌ [Stripe] Erreur lors de la création du coupon:", error);
        return NextResponse.json(
          { error: "Erreur lors de l'application du code promo" },
          { status: 500 }
        );
      }
    }

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    let planName: string;
    let metadata: any = {
      userId: dbUser.id,  // ✅ Utilise l'ID de l'utilisateur au lieu de l'email
      userEmail: session.user.email,  // Garder l'email pour les logs
      planId,
      billing,
    };

    // Ajouter le code promo dans les metadata si utilisé
    if (validatedPromoCode) {
      metadata.promoCodeId = validatedPromoCode.id;
      metadata.promoCode = validatedPromoCode.code;
      metadata.discountPercent = validatedPromoCode.discountPercent;
    }

    // Récupérer le Price ID Stripe correspondant
    let priceId: string | undefined;
    let quantity: number = 1;

    if (planId === "solo" && billing === "monthly") {
      priceId = process.env.STRIPE_PRICE_ID_SOLO_MONTHLY;
      planName = "Plan Solo - Mensuel";
    } else if (planId === "solo" && billing === "yearly") {
      priceId = process.env.STRIPE_PRICE_ID_SOLO_YEARLY;
      planName = "Plan Solo - Annuel";
    } else if (planId === "family" && billing === "monthly") {
      priceId = process.env.STRIPE_PRICE_ID_FAMILY_MONTHLY;
      planName = "Plan Famille - Mensuel";
    } else if (planId === "family" && billing === "yearly") {
      priceId = process.env.STRIPE_PRICE_ID_FAMILY_YEARLY;
      planName = "Plan Famille - Annuel";
    } else if (planId === "pro") {
      // Plan Pro avec quantity pour le nombre de comptes
      if (!accountCount || accountCount < 10) {
        return NextResponse.json(
          { error: "Le plan Pro nécessite au moins 10 comptes" },
          { status: 400 }
        );
      }

      priceId = billing === "monthly"
        ? process.env.STRIPE_PRICE_ID_PRO_MONTHLY
        : process.env.STRIPE_PRICE_ID_PRO_YEARLY;

      quantity = accountCount;
      planName = `Plan Pro - ${accountCount} comptes - ${billing === "yearly" ? "Annuel" : "Mensuel"}`;
      metadata.accountCount = accountCount;
    } else {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "Prix non configuré pour ce plan. Vérifiez vos variables d'environnement." },
        { status: 500 }
      );
    }

    lineItems = [
      {
        price: priceId,
        quantity: quantity,
      },
    ];

    // Créer la session Stripe Checkout
    const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: session.user.email, // Email du compte principal
      billing_address_collection: "required", // Demander l'adresse de facturation
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata,
      subscription_data: {
        metadata,
      },
    };

    // Appliquer le coupon si code promo validé
    if (stripeCouponId) {
      checkoutSessionParams.discounts = [
        {
          coupon: stripeCouponId,
        },
      ];
      console.log(`✅ [Stripe] Coupon ${stripeCouponId} appliqué à la session checkout`);
    }

    const checkoutSession = await stripe.checkout.sessions.create(checkoutSessionParams);

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error: any) {
    console.error("Erreur lors de la création de la session Stripe:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la création de la session de paiement",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
