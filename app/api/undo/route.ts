import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { getActivity, removeActivity } from "@/lib/activity-store";
import { getGmailClient } from "@/lib/gmail-scanner";

/**
 * POST /api/undo
 *
 * Annuler une action
 *
 * Body params:
 * - activityId: string - ID de l'activité à annuler
 */
export async function POST(request: NextRequest) {
  const session = await getIronSession(await cookies(), sessionOptions);

  if (!session.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { activityId } = body;

    if (!activityId) {
      return NextResponse.json(
        { error: "ID de l'activité manquant" },
        { status: 400 }
      );
    }

    const activity = getActivity(session.user.email, activityId);

    if (!activity) {
      return NextResponse.json(
        { error: "Activité non trouvée" },
        { status: 404 }
      );
    }

    if (!activity.canUndo) {
      return NextResponse.json(
        { error: "Cette action ne peut pas être annulée" },
        { status: 400 }
      );
    }

    const accessToken = session.user.accessToken;
    const gmail = getGmailClient(accessToken);

    // Logique d'undo selon le type
    switch (activity.type) {
      case "trash": {
        // Pour annuler trash : retirer TRASH et remettre INBOX
        const searchResponse = await gmail.users.messages.list({
          userId: "me",
          q: `from:${activity.target} in:trash`,
          maxResults: 500,
        });

        const messages = searchResponse.data.messages || [];
        if (messages.length > 0) {
          const messageIds = messages.map((m) => m.id!);

          await gmail.users.messages.batchModify({
            userId: "me",
            requestBody: {
              ids: messageIds,
              addLabelIds: ["INBOX"],
              removeLabelIds: ["TRASH"],
            },
          });
        }
        break;
      }

      case "archive": {
        // Pour annuler archive : remettre INBOX
        const searchResponse = await gmail.users.messages.list({
          userId: "me",
          q: `from:${activity.target} -in:inbox`,
          maxResults: 500,
        });

        const messages = searchResponse.data.messages || [];
        if (messages.length > 0) {
          const messageIds = messages.map((m) => m.id!);

          await gmail.users.messages.batchModify({
            userId: "me",
            requestBody: {
              ids: messageIds,
              addLabelIds: ["INBOX"],
            },
          });
        }
        break;
      }

      case "unsubscribe":
        // Unsubscribe ne peut pas être annulé
        return NextResponse.json(
          { error: "Le désabonnement ne peut pas être annulé" },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          { error: "Type d'action non supporté" },
          { status: 400 }
        );
    }

    // Supprimer l'activité après undo
    removeActivity(session.user.email, activityId);

    return NextResponse.json({
      success: true,
      message: "Action annulée avec succès",
    });
  } catch (error: any) {
    console.error("Erreur lors de l'annulation:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'annulation",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
