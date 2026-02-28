import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

/**
 * GET /api/stripe/session?session_id=xxx
 *
 * Récupérer les détails d'une session Stripe
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID manquant" },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription"],
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        customer_email: session.customer_email,
        customer_details: session.customer_details,
        amount_total: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        metadata: session.metadata,
      },
    });
  } catch (error: any) {
    console.error("Erreur lors de la récupération de la session:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de la session",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
