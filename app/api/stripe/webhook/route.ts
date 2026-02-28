import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { createInvoice } from "@/lib/invoice-generator";
import { sendPurchaseConfirmationEmail } from "@/lib/email-service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * POST /api/stripe/webhook
 *
 * Webhook Stripe pour gérer les événements de paiement
 *
 * Événements gérés:
 * - checkout.session.completed : Paiement réussi
 * - customer.subscription.updated : Abonnement mis à jour
 * - customer.subscription.deleted : Abonnement annulé
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Signature manquante" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Vérifier la signature du webhook
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Erreur de vérification de signature:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Gérer les différents types d'événements
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("✅ Paiement réussi:", {
          sessionId: session.id,
          customerEmail: session.customer_email,
          amount: session.amount_total,
          metadata: session.metadata,
        });

        // Sauvegarder l'abonnement dans la base de données
        if (session.metadata?.userId && session.subscription && session.customer) {
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
          const customerId = typeof session.customer === 'string'
            ? session.customer
            : session.customer.id;

          // Récupérer l'abonnement Stripe complet pour obtenir les détails
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

          console.log(`🔍 [webhook] Détails de l'abonnement Stripe:`, {
            id: stripeSubscription.id,
            status: stripeSubscription.status,
            current_period_start: (stripeSubscription as any).current_period_start,
            current_period_end: (stripeSubscription as any).current_period_end,
            billing_cycle_anchor: (stripeSubscription as any).billing_cycle_anchor,
          });

          // Récupérer la première ligne d'abonnement pour obtenir le Price ID et la quantity
          const firstItem = stripeSubscription.items.data[0];
          const quantity = firstItem?.quantity || 1;
          const stripePriceId = firstItem?.price.id;

          // Extraire les dates de période (peuvent être dans current_period ou billing_cycle_anchor)
          const currentPeriodStart = (stripeSubscription as any).current_period_start
            || (stripeSubscription as any).billing_cycle_anchor
            || Math.floor(Date.now() / 1000);
          const currentPeriodEnd = (stripeSubscription as any).current_period_end
            || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // +30 jours par défaut

          console.log(`🔍 [webhook] Dates extraites:`, {
            currentPeriodStart,
            currentPeriodEnd,
            currentPeriodStartDate: new Date(currentPeriodStart * 1000).toISOString(),
            currentPeriodEndDate: new Date(currentPeriodEnd * 1000).toISOString(),
          });

          const subscriptionData = {
            userId: session.metadata.userId,
            planId: session.metadata.planId || 'solo',
            billing: session.metadata.billing || 'monthly',
            quantity: quantity,
            stripePriceId: stripePriceId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: stripeSubscription.status,
            currentPeriodStart: new Date(currentPeriodStart * 1000),
            currentPeriodEnd: new Date(currentPeriodEnd * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          };

          // Vérifier si une subscription existe déjà pour cet utilisateur
          const existingSubscription = await prisma.subscription.findUnique({
            where: { userId: session.metadata.userId },
          });

          if (existingSubscription) {
            console.log(`🔄 [webhook] Subscription existante trouvée, mise à jour...`);
            await prisma.subscription.update({
              where: { userId: session.metadata.userId },
              data: subscriptionData,
            });
          } else {
            console.log(`✨ [webhook] Création d'une nouvelle subscription...`);
            await prisma.subscription.create({
              data: subscriptionData,
            });
          }

          // Mettre à jour le plan de l'utilisateur
          const planId = session.metadata.planId || 'solo';

          // Vérifier que l'utilisateur existe avant de mettre à jour
          const userToUpdate = await prisma.user.findUnique({
            where: { id: session.metadata.userId },
          });

          if (!userToUpdate) {
            console.error(`❌ [webhook] Utilisateur ${session.metadata.userId} introuvable ! Email: ${session.metadata.userEmail || session.customer_email}`);
            // Essayer de trouver par email en fallback
            const userByEmail = await prisma.user.findUnique({
              where: { email: session.customer_email || session.metadata.userEmail },
            });

            if (userByEmail) {
              console.log(`✅ [webhook] Utilisateur trouvé par email: ${userByEmail.email} (ID: ${userByEmail.id})`);
              await prisma.user.update({
                where: { id: userByEmail.id },
                data: { plan: planId },
              });
            } else {
              console.error(`❌ [webhook] Impossible de trouver l'utilisateur par ID ni par email !`);
            }
          } else {
            await prisma.user.update({
              where: { id: session.metadata.userId },
              data: { plan: planId },
            });
            console.log(`✅ [webhook] Plan mis à jour pour ${userToUpdate.email} (${userToUpdate.id}): ${planId}`);
          }

          console.log(`✅ Abonnement créé pour l'utilisateur ${session.metadata.userId} - Plan: ${planId}, Billing: ${session.metadata.billing}, Quantity: ${quantity}`);

          // Auto-créer une Team si le plan est Family ou Pro
          if (['family', 'pro'].includes(planId)) {
            const userId = userToUpdate?.id || session.metadata.userId;

            // Vérifier si une Team existe déjà
            const existingTeam = await prisma.team.findUnique({
              where: { ownerUserId: userId },
            });

            if (!existingTeam) {
              // Déterminer le nombre de places
              const seatsTotal = planId === 'family' ? 5 : quantity;

              // Créer la Team
              await prisma.team.create({
                data: {
                  ownerUserId: userId,
                  plan: planId,
                  seatsTotal: seatsTotal,
                  seatsUsed: 1, // Le owner compte pour 1 seat
                },
              });

              console.log(`✨ [webhook] Team créée automatiquement pour ${userId} - Plan: ${planId}, Seats: ${seatsTotal}`);
            } else {
              // Si la Team existe déjà, mettre à jour seatsTotal (au cas où la quantity a changé)
              const seatsTotal = planId === 'family' ? 5 : quantity;

              await prisma.team.update({
                where: { ownerUserId: userId },
                data: {
                  plan: planId,
                  seatsTotal: seatsTotal,
                },
              });

              console.log(`🔄 [webhook] Team mise à jour pour ${userId} - Plan: ${planId}, Seats: ${seatsTotal}`);
            }
          }

          // Enregistrer l'utilisation du code promo si applicable
          if (session.metadata.promoCodeId && session.metadata.promoCode) {
            const user = await prisma.user.findUnique({
              where: { id: session.metadata.userId },
            });

            if (user) {
              try {
                // Créer l'enregistrement de redemption
                await prisma.promoCodeRedemption.create({
                  data: {
                    promoCodeId: session.metadata.promoCodeId,
                    userId: user.id,
                    userEmail: user.email,
                    planId: session.metadata.planId || 'solo',
                    billing: session.metadata.billing || 'monthly',
                    discountApplied: parseInt(session.metadata.discountPercent || '0'),
                  },
                });

                // Incrémenter le compteur d'utilisations
                await prisma.promoCode.update({
                  where: { id: session.metadata.promoCodeId },
                  data: {
                    currentUses: {
                      increment: 1,
                    },
                  },
                });

                console.log(`✅ Code promo ${session.metadata.promoCode} enregistré pour ${user.email}`);
              } catch (error: any) {
                console.error(`❌ Erreur lors de l'enregistrement du code promo:`, error);
              }
            }
          }
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("🔄 Abonnement mis à jour:", {
          subscriptionId: subscription.id,
          status: subscription.status,
          metadata: subscription.metadata,
        });

        // Mettre à jour le statut de l'abonnement dans la base de données
        const existingSub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
          include: { user: true },
        });

        if (existingSub) {
          // Récupérer la quantity depuis les items Stripe
          const firstItem = subscription.items.data[0];
          const quantity = firstItem?.quantity || 1;
          const stripePriceId = firstItem?.price.id;

          // Extraire les dates de période
          const currentPeriodStart = (subscription as any).current_period_start
            || (subscription as any).billing_cycle_anchor
            || Math.floor(Date.now() / 1000);
          const currentPeriodEnd = (subscription as any).current_period_end
            || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: subscription.status,
              quantity: quantity,
              stripePriceId: stripePriceId,
              currentPeriodStart: new Date(currentPeriodStart * 1000),
              currentPeriodEnd: new Date(currentPeriodEnd * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              canceledAt: subscription.cancel_at_period_end ? new Date() : null,
            },
          });

          // Si l'abonnement est annulé ou expiré, rétrograder l'utilisateur à free
          if (['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status)) {
            await prisma.user.update({
              where: { id: existingSub.userId },
              data: { plan: 'free' },
            });
            console.log(`📉 Utilisateur ${existingSub.userId} rétrogradé à 'free'`);
          } else if (['family', 'pro'].includes(existingSub.planId)) {
            // Pour les plans Family et Pro, synchroniser seatsTotal avec Stripe
            const team = await prisma.team.findUnique({
              where: { ownerUserId: existingSub.userId },
            });

            if (team) {
              const seatsTotal = existingSub.planId === 'family' ? 5 : quantity;

              // Mettre à jour seatsTotal seulement si changé
              if (team.seatsTotal !== seatsTotal) {
                await prisma.team.update({
                  where: { ownerUserId: existingSub.userId },
                  data: {
                    seatsTotal: seatsTotal,
                  },
                });
                console.log(`🔄 [webhook] Team seatsTotal mis à jour: ${team.seatsTotal} → ${seatsTotal}`);
              }
            }
          }

          console.log(`✅ Abonnement ${subscription.id} mis à jour: ${subscription.status}, Quantity: ${quantity}`);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("❌ Abonnement annulé:", {
          subscriptionId: subscription.id,
          metadata: subscription.metadata,
        });

        // Marquer l'abonnement comme annulé dans la base de données
        const existingSub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
          include: { user: true },
        });

        if (existingSub) {
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: 'canceled',
              canceledAt: new Date(),
            },
          });

          // Rétrograder l'utilisateur à free
          await prisma.user.update({
            where: { id: existingSub.userId },
            data: { plan: 'free' },
          });

          console.log(`✅ Abonnement ${subscription.id} annulé, utilisateur ${existingSub.userId} rétrogradé à 'free'`);
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("💰 Paiement de facture réussi:", {
          invoiceId: invoice.id,
          subscriptionId: (invoice as any).subscription,
          amount: invoice.amount_paid,
          customerEmail: invoice.customer_email,
        });

        // Récupérer l'abonnement depuis la base de données
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

        if (subscriptionId) {
          const subscription = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
            include: { user: true },
          });

          if (subscription && subscription.user) {
            // Déterminer les noms de plans
            const planNames: Record<string, string> = {
              solo: 'Solo',
              family: 'Famille',
              pro: 'Pro',
            };
            const planName = planNames[subscription.planId] || subscription.planId;

            try {
              // 1. Créer la facture dans la base de données (idempotent)
              const dbInvoice = await createInvoice({
                userId: subscription.userId,
                subscriptionId: subscription.id,
                stripeInvoiceId: invoice.id,
                planId: subscription.planId,
                planName: planName,
                billing: subscription.billing || 'monthly',
                amount: invoice.amount_paid || 0,
                currency: invoice.currency || 'eur',
                periodStart: subscription.currentPeriodStart || new Date(),
                periodEnd: subscription.currentPeriodEnd || new Date(),
                paidAt: invoice.status_transitions?.paid_at
                  ? new Date(invoice.status_transitions.paid_at * 1000)
                  : new Date(),
                transactionId: invoice.payment_intent
                  ? (typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent.id)
                  : undefined,
                paymentMethod: invoice.payment_intent ? 'card' : undefined,
                customerEmail: invoice.customer_email || subscription.user.email,
                customerName: subscription.user.name || undefined,
              });

              console.log(`✅ [webhook] Facture créée: ${dbInvoice.invoiceNumber}`);

              // 2. Envoyer l'email de confirmation SEULEMENT si pas déjà envoyé
              if (!subscription.purchaseEmailSentAt) {
                try {
                  await sendPurchaseConfirmationEmail({
                    user: {
                      email: subscription.user.email,
                      name: subscription.user.name,
                    },
                    subscription: {
                      planId: subscription.planId,
                      billing: subscription.billing || 'monthly',
                      currentPeriodStart: subscription.currentPeriodStart || new Date(),
                      currentPeriodEnd: subscription.currentPeriodEnd || new Date(),
                      amount: invoice.amount_paid || 0,
                    },
                    invoice: {
                      invoiceNumber: dbInvoice.invoiceNumber,
                      transactionId: dbInvoice.transactionId || undefined,
                    },
                  });

                  // Marquer l'email comme envoyé
                  await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { purchaseEmailSentAt: new Date() },
                  });

                  console.log(`✅ [webhook] Email de confirmation envoyé à ${subscription.user.email}`);
                } catch (emailError) {
                  console.error(`❌ [webhook] Erreur lors de l'envoi de l'email:`, emailError);
                  // Ne pas bloquer le webhook si l'email échoue
                }
              } else {
                console.log(`ℹ️ [webhook] Email déjà envoyé pour cette subscription (${subscription.purchaseEmailSentAt.toISOString()})`);
              }

            } catch (error) {
              console.error(`❌ [webhook] Erreur lors de la création de la facture:`, error);
              // Ne pas bloquer le webhook
            }
          }
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("⚠️ Échec du paiement:", {
          invoiceId: invoice.id,
          subscriptionId: (invoice as any).subscription,
          customerEmail: invoice.customer_email,
        });

        // TODO: Notifier l'utilisateur de l'échec du paiement par email
        break;
      }

      default:
        console.log(`ℹ️ Événement reçu mais non traité: ${event.type}`);
    }

    return NextResponse.json({ received: true, event: event.type });
  } catch (error: any) {
    console.error("Erreur lors du traitement du webhook:", error);
    return NextResponse.json(
      {
        error: "Erreur lors du traitement du webhook",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
