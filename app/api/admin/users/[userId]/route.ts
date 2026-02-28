import { NextRequest, NextResponse } from "next/server";
import {
  requireAdmin,
  getUserDetails,
  toggleUserActiveStatus,
  updateUserPlan,
  deleteUser,
  logAdminAction,
} from "@/lib/admin-helpers";

// GET /api/admin/users/[userId] - Récupérer les détails d'un utilisateur
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Vérifier que l'utilisateur est admin
    const authCheck = await requireAdmin();

    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { userId } = await params;

    // Récupérer les détails de l'utilisateur
    const user = await getUserDetails(userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error in GET /api/admin/users/[userId]:", error);
    return NextResponse.json(
      { error: "Failed to fetch user details" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[userId] - Mettre à jour un utilisateur
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Vérifier que l'utilisateur est admin
    const authCheck = await requireAdmin();

    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { userId } = await params;
    const body = await request.json();

    let user;
    let actionDescription = "";

    // Mettre à jour le statut actif/suspendu
    if (body.isActive !== undefined) {
      user = await toggleUserActiveStatus(userId, body.isActive);
      actionDescription = body.isActive ? "activate_user" : "suspend_user";

      await logAdminAction({
        adminEmail: authCheck.admin.email,
        action: actionDescription,
        targetType: "user",
        targetId: userId,
        details: { isActive: body.isActive },
        request,
      });
    }

    // Mettre à jour le plan
    if (body.plan) {
      user = await updateUserPlan(userId, body.plan);
      actionDescription = "change_plan";

      await logAdminAction({
        adminEmail: authCheck.admin.email,
        action: actionDescription,
        targetType: "user",
        targetId: userId,
        details: { newPlan: body.plan },
        request,
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error in PATCH /api/admin/users/[userId]:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[userId] - Supprimer un utilisateur
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Vérifier que l'utilisateur est admin
    const authCheck = await requireAdmin();

    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { userId } = await params;

    // Récupérer l'utilisateur avant de le supprimer (pour le log)
    const user = await getUserDetails(userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Supprimer l'utilisateur
    await deleteUser(userId);

    // Logger l'action
    await logAdminAction({
      adminEmail: authCheck.admin.email,
      action: "delete_user",
      targetType: "user",
      targetId: userId,
      details: { deletedEmail: user.email },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/users/[userId]:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
