import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Route pour récupérer les informations de l'utilisateur connecté
export async function GET() {
  console.log("🔍 [auth/me] Vérification de la session...");
  try {
    const session = await getSession();

    console.log(`🔍 [auth/me] Session récupérée:`);
    console.log(`  - isLoggedIn: ${session.isLoggedIn}`);
    console.log(`  - user exists: ${session.user ? "✅" : "❌"}`);
    if (session.user) {
      console.log(`  - user.email: ${session.user.email}`);
      console.log(`  - user.accessToken: ${session.user.accessToken ? "✅ présent" : "❌ absent"}`);
    }

    if (!session.isLoggedIn || !session.user) {
      console.log("❌ [auth/me] Pas de session active");
      return NextResponse.json(
        { isLoggedIn: false },
        { status: 401 }
      );
    }

    // Récupérer les données de l'utilisateur depuis la base de données
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        role: true,
        plan: true,
        isActive: true,
      },
    });

    // Récupérer la subscription active pour déterminer le vrai plan
    let finalPlan = dbUser?.plan || "free";

    if (dbUser) {
      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          userId: dbUser.id,
          status: { in: ["active", "trialing", "manual"] }, // Inclure "manual" pour les changements admin
        },
        orderBy: {
          currentPeriodEnd: "desc",
        },
      });

      // Si une subscription active existe, utiliser son plan (source de vérité)
      if (activeSubscription) {
        finalPlan = activeSubscription.planId;
        console.log(`✅ [auth/me] Subscription active trouvée: ${finalPlan} (status: ${activeSubscription.status})`);

        // Si User.plan est différent de Subscription.planId, le synchroniser
        if (dbUser.plan !== activeSubscription.planId) {
          console.warn(`⚠️ [auth/me] Incohérence détectée ! User.plan="${dbUser.plan}" mais Subscription.planId="${activeSubscription.planId}"`);
          console.log(`🔄 [auth/me] Synchronisation User.plan avec Subscription...`);

          await prisma.user.update({
            where: { id: dbUser.id },
            data: { plan: activeSubscription.planId },
          });

          console.log(`✅ [auth/me] User.plan synchronisé: ${activeSubscription.planId}`);
        }
      } else {
        // Pas de subscription active, vérifier si User.plan est premium
        if (dbUser.plan && !["free"].includes(dbUser.plan)) {
          console.warn(`⚠️ [auth/me] User.plan="${dbUser.plan}" mais aucune subscription active !`);
          console.log(`🔄 [auth/me] Rétrogradation vers "free"...`);

          await prisma.user.update({
            where: { id: dbUser.id },
            data: { plan: "free" },
          });

          finalPlan = "free";
          console.log(`✅ [auth/me] User.plan rétrogradé à "free"`);
        }
      }
    }

    // Ne pas renvoyer le token d'accès au client
    const { accessToken, refreshToken, ...userInfo } = session.user;

    console.log("✅ [auth/me] Session valide, utilisateur connecté");
    console.log(`  - role: ${dbUser?.role || "user"}`);
    console.log(`  - plan: ${finalPlan}`);

    return NextResponse.json({
      isLoggedIn: true,
      user: {
        ...userInfo,
        role: dbUser?.role || "user",
        plan: finalPlan,
        isActive: dbUser?.isActive ?? true,
      },
    });
  } catch (error: any) {
    console.error("❌ [auth/me] Erreur lors de la récupération de l'utilisateur:");
    console.error(`  - Message: ${error.message}`);
    console.error(`  - Stack: ${error.stack}`);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
