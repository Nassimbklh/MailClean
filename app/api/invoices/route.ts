import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserInvoices } from "@/lib/invoice-generator";
import prisma from "@/lib/prisma";

/**
 * GET /api/invoices
 *
 * Récupère toutes les factures de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur depuis la DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Récupérer les factures
    const invoices = await getUserInvoices(user.id);

    return NextResponse.json({
      success: true,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        planName: inv.planName,
        billing: inv.billing,
        amount: inv.amount,
        currency: inv.currency,
        periodStart: inv.periodStart.toISOString(),
        periodEnd: inv.periodEnd.toISOString(),
        paidAt: inv.paidAt?.toISOString(),
        createdAt: inv.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("❌ [invoices] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des factures",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
