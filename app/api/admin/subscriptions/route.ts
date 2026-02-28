import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAllSubscriptions } from "@/lib/admin-helpers";

export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const authCheck = await requireAdmin();

    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    // Récupérer les paramètres de requête
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || undefined;

    // Récupérer les abonnements
    const result = await getAllSubscriptions({
      page,
      limit,
      status,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/admin/subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}
