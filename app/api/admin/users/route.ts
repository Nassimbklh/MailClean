import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAllUsers, logAdminAction } from "@/lib/admin-helpers";

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
    const search = searchParams.get("search") || undefined;
    const plan = searchParams.get("plan") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive = isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;

    // Récupérer les utilisateurs
    const result = await getAllUsers({
      page,
      limit,
      search,
      plan,
      isActive,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/admin/users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
