import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { sendWelcomeEmail, sendMarketingNudge, sendPremiumPromoEmail } from "@/lib/email-service";

/**
 * POST /api/admin/send-test-email
 *
 * Envoie un email de test aux utilisateurs sélectionnés
 * Body: { userIds: string[], emailType: 'welcome' | 'marketing' | 'premium' }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Vérifier que l'utilisateur est admin
    if (!session.isLoggedIn || !session.user?.email) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        { error: "Accès admin requis" },
        { status: 403 }
      );
    }

    // Parser le body
    const { userIds, emailType } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "Liste d'utilisateurs requise" },
        { status: 400 }
      );
    }

    if (!emailType || !['welcome', 'marketing', 'premium'].includes(emailType)) {
      return NextResponse.json(
        { error: "Type d'email invalide (welcome, marketing, premium)" },
        { status: 400 }
      );
    }

    // Récupérer les utilisateurs
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
      }
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Aucun utilisateur trouvé" },
        { status: 404 }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as { email: string; error: string }[],
    };

    // Envoyer les emails
    for (const user of users) {
      try {
        switch (emailType) {
          case 'welcome':
            await sendWelcomeEmail({
              email: user.email,
              name: user.name,
            });
            break;

          case 'marketing':
            await sendMarketingNudge({
              email: user.email,
              name: user.name,
              plan: user.plan,
            });
            break;

          case 'premium':
            // Email promotion Premium avec code promo -10% généré automatiquement
            await sendPremiumPromoEmail({
              email: user.email,
              name: user.name,
              userId: user.id,
            });
            break;
        }

        results.success.push(user.email);
        console.log(`✅ [Admin] Email ${emailType} envoyé à ${user.email}`);

      } catch (error: any) {
        results.failed.push({
          email: user.email,
          error: error.message || 'Erreur inconnue'
        });
        console.error(`❌ [Admin] Échec envoi à ${user.email}:`, error);
      }
    }

    // Logger l'action admin
    await prisma.adminLog.create({
      data: {
        adminEmail: adminUser.email,
        action: 'send_test_email',
        targetType: 'users',
        details: JSON.stringify({
          emailType,
          userIds,
          successCount: results.success.length,
          failedCount: results.failed.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Emails envoyés: ${results.success.length} succès, ${results.failed.length} échecs`,
      results,
    });

  } catch (error: any) {
    console.error("❌ [Admin] Erreur lors de l'envoi des emails de test:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
