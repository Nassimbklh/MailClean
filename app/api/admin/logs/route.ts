import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminLogs } from "@/lib/admin-helpers";

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
    const limit = parseInt(searchParams.get("limit") || "50");
    const action = searchParams.get("action") || undefined;
    const adminEmail = searchParams.get("adminEmail") || undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    // Récupérer les logs
    const result = await getAdminLogs({
      page,
      limit,
      startDate,
      endDate,
      action,
      adminEmail,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/admin/logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin logs" },
      { status: 500 }
    );
  }
}
