import { NextResponse } from "next/server";
import { requireAdmin, getPlatformStats } from "@/lib/admin-helpers";

export async function GET() {
  try {
    // Vérifier que l'utilisateur est admin
    const authCheck = await requireAdmin();

    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    // Récupérer les statistiques
    const stats = await getPlatformStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error in /api/admin/stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform statistics" },
      { status: 500 }
    );
  }
}
