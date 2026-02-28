import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";

/**
 * GET /api/auth/whoami
 *
 * Endpoint de debug pour diagnostiquer les problèmes de session
 */
export async function GET(request: NextRequest) {
  console.log("🔍 [whoami] === DEBUG SESSION ===");

  try {
    // 1. Vérifier les cookies reçus
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    console.log(`🔍 [whoami] Cookies reçus (${allCookies.length}):`);
    allCookies.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
    });

    // 2. Vérifier le cookie de session spécifique
    const sessionCookie = cookieStore.get('cleanmail_session');
    console.log(`🔍 [whoami] Cookie cleanmail_session: ${sessionCookie ? '✅ PRÉSENT' : '❌ ABSENT'}`);

    if (sessionCookie) {
      console.log(`  - Value (20 premiers chars): ${sessionCookie.value.substring(0, 20)}...`);
    }

    // 3. Récupérer la session
    console.log("🔍 [whoami] Tentative de récupération de la session...");
    const session = await getSession();

    console.log(`🔍 [whoami] Session récupérée:`);
    console.log(`  - isLoggedIn: ${session.isLoggedIn}`);
    console.log(`  - user exists: ${session.user ? '✅' : '❌'}`);

    if (session.user) {
      console.log(`  - user.email: ${session.user.email}`);
      console.log(`  - user.name: ${session.user.name || 'non défini'}`);
      console.log(`  - user.accessToken: ${session.user.accessToken ? `✅ présent (${session.user.accessToken.substring(0, 10)}...)` : '❌ absent'}`);
      console.log(`  - user.refreshToken: ${session.user.refreshToken ? '✅ présent' : '❌ absent'}`);
    }

    // 4. Headers de la requête
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('cookie')) {
        headers[key] = value.substring(0, 50) + '...';
      }
    });

    console.log(`🔍 [whoami] Headers avec cookies:`, headers);

    return NextResponse.json({
      success: true,
      debug: {
        hasSession: session.isLoggedIn || false,
        hasUser: !!session.user,
        userEmail: session.user?.email || null,
        userName: session.user?.name || null,
        hasAccessToken: !!session.user?.accessToken,
        hasRefreshToken: !!session.user?.refreshToken,
        cookiesReceived: allCookies.length,
        sessionCookiePresent: !!sessionCookie,
        cookieNames: allCookies.map(c => c.name),
      },
      session: session.isLoggedIn ? {
        email: session.user?.email,
        name: session.user?.name,
        hasTokens: !!(session.user?.accessToken && session.user?.refreshToken),
      } : null,
    });
  } catch (error: any) {
    console.error("❌ [whoami] Erreur:", error.message);
    console.error("  Stack:", error.stack);

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
