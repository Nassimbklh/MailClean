import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { getMessages, getMessage } from "@/lib/gmail-scanner";

/**
 * GET /api/messages
 *
 * Récupère une liste paginée de messages
 *
 * Query params:
 * - maxResults: number (défaut 50)
 * - pageToken: string (optionnel)
 * - q: string (optionnel) - Query Gmail (ex: "from:example@gmail.com")
 * - format: "full" | "metadata" | "minimal" (défaut "metadata")
 */
export async function GET(request: NextRequest) {
  const session = await getIronSession(await cookies(), sessionOptions);

  if (!session.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const maxResults = parseInt(searchParams.get("maxResults") || "50");
    const pageToken = searchParams.get("pageToken") || undefined;
    const query = searchParams.get("q") || undefined;
    const format = searchParams.get("format") || "metadata";

    const accessToken = session.user.accessToken;

    // Récupérer la liste des messages
    const result = await getMessages(accessToken, maxResults, pageToken, query);

    // Récupérer les détails de chaque message
    const messagesDetails = await Promise.all(
      result.messages.map(async (msg) => {
        if (!msg.id) return null;

        try {
          const details = await getMessage(accessToken, msg.id, format);

          // Extraire les headers importants
          const headers = details.payload?.headers || [];
          const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "(No Subject)";
          const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
          const date = headers.find((h) => h.name?.toLowerCase() === "date")?.value || "";

          return {
            id: details.id,
            threadId: details.threadId,
            labelIds: details.labelIds || [],
            snippet: details.snippet || "",
            subject,
            from,
            date,
            internalDate: details.internalDate,
            sizeEstimate: details.sizeEstimate,
          };
        } catch (error) {
          console.error(`Erreur pour le message ${msg.id}:`, error);
          return null;
        }
      })
    );

    // Filtrer les null
    const validMessages = messagesDetails.filter((m) => m !== null);

    return NextResponse.json({
      success: true,
      messages: validMessages,
      nextPageToken: result.nextPageToken,
      resultSizeEstimate: result.resultSizeEstimate,
    });
  } catch (error: any) {
    console.error("Erreur lors de la récupération des messages:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des messages",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
