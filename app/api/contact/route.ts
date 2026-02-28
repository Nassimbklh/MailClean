import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/contact
 *
 * Envoie un email de contact
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email invalide" },
        { status: 400 }
      );
    }

    // Validation longueur
    if (name.length > 100 || subject.length > 200 || message.length > 5000) {
      return NextResponse.json(
        { error: "Un ou plusieurs champs sont trop longs" },
        { status: 400 }
      );
    }

    // Envoyer l'email via Resend
    const emailData = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to: process.env.CONTACT_EMAIL || "contact@mailclean.com", // Email où vous recevez les messages
      replyTo: email, // L'utilisateur pourra répondre directement
      subject: `[Contact CleanMail] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Nouveau message de contact</h2>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Nom :</strong> ${name}</p>
            <p style="margin: 5px 0;"><strong>Email :</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Sujet :</strong> ${subject}</p>
          </div>

          <div style="background-color: #ffffff; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <h3 style="margin-top: 0;">Message :</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

          <p style="color: #6b7280; font-size: 12px;">
            Ce message a été envoyé depuis le formulaire de contact de CleanMail.
          </p>
        </div>
      `,
    });

    console.log("✅ [contact] Email envoyé avec succès:", emailData);

    // Email de confirmation à l'utilisateur (optionnel)
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || "onboarding@resend.dev",
        to: email,
        subject: "Votre message a bien été reçu - CleanMail",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Merci de nous avoir contactés !</h2>

            <p style="line-height: 1.6;">Bonjour ${name},</p>

            <p style="line-height: 1.6;">
              Nous avons bien reçu votre message concernant : <strong>${subject}</strong>
            </p>

            <p style="line-height: 1.6;">
              Notre équipe vous répondra dans les plus brefs délais, généralement sous 24-48 heures.
            </p>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Récapitulatif de votre message :</h3>
              <p style="white-space: pre-wrap; line-height: 1.6; color: #6b7280;">${message}</p>
            </div>

            <p style="line-height: 1.6;">
              À très bientôt,<br />
              <strong>L'équipe CleanMail</strong>
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              CleanMail - Reprenez le contrôle de votre boîte mail
            </p>
          </div>
        `,
      });
    } catch (confirmError) {
      console.warn("⚠️ [contact] Erreur envoi email de confirmation:", confirmError);
      // On ne bloque pas si l'email de confirmation échoue
    }

    return NextResponse.json({
      success: true,
      message: "Votre message a été envoyé avec succès",
    });
  } catch (error: any) {
    console.error("❌ [contact] Erreur lors de l'envoi:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'envoi du message",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
