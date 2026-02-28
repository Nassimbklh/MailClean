import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { generateInvoiceHTML } from "@/lib/invoice-generator";
import prisma from "@/lib/prisma";

/**
 * GET /api/invoices/[invoiceId]
 *
 * Télécharger une facture spécifique (HTML)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invoiceId: string }> }
) {
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

    const { invoiceId } = await context.params;

    // Récupérer la facture
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Facture introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que la facture appartient à l'utilisateur
    if (invoice.userId !== user.id) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    // Générer le HTML de la facture
    const html = generateInvoiceHTML(invoice);

    // Retourner le HTML avec les bons headers
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="facture-${invoice.invoiceNumber}.html"`,
      },
    });
  } catch (error: any) {
    console.error("❌ [invoices/download] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors du téléchargement de la facture",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
