import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";

// Configuration de la session sécurisée
export const sessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long",
  cookieName: "cleanmail_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const, // Important pour OAuth redirect
    path: "/", // Cookie disponible sur tout le site
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  },
};

// Récupérer la session de l'utilisateur
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Sauvegarder l'utilisateur dans la session
export async function saveUserToSession(user: SessionData["user"]) {
  console.log("💾 [session] Début de la sauvegarde session");
  console.log(`💾 [session] User email: ${user?.email}`);

  const session = await getSession();
  session.user = user;
  session.isLoggedIn = true;

  console.log("💾 [session] Appel de session.save()...");
  await session.save();

  console.log("✅ [session] Session sauvegardée avec succès");
  console.log(`✅ [session] Cookie: cleanmail_session`);
  console.log(`✅ [session] Vérification - isLoggedIn: ${session.isLoggedIn}`);
  console.log(`✅ [session] Vérification - user.email: ${session.user?.email}`);
}

// Déconnecter l'utilisateur
export async function logoutUser() {
  const session = await getSession();
  session.destroy();
}
