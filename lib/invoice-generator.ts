import prisma from '@/lib/prisma';

/**
 * Générer un numéro de facture unique
 * Format: INV-YYYY-NNNNNN (ex: INV-2024-000123)
 */
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();

  // Compter les factures de l'année en cours
  const count = await prisma.invoice.count({
    where: {
      invoiceNumber: {
        startsWith: `INV-${year}-`
      }
    }
  });

  // Numéro suivant avec padding de 6 chiffres
  const nextNumber = (count + 1).toString().padStart(6, '0');

  return `INV-${year}-${nextNumber}`;
}

/**
 * Créer une facture pour un abonnement
 * Idempotent: ne crée pas de doublon si stripeInvoiceId existe déjà
 */
export async function createInvoice(data: {
  userId: string;
  subscriptionId: string;
  stripeInvoiceId?: string;
  planId: string;
  planName: string;
  billing: string;
  amount: number; // en centimes
  currency?: string;
  periodStart: Date;
  periodEnd: Date;
  paidAt?: Date;
  transactionId?: string;
  paymentMethod?: string;
  customerEmail: string;
  customerName?: string;
}) {
  // Vérifier si la facture existe déjà (idempotence)
  if (data.stripeInvoiceId) {
    const existing = await prisma.invoice.findUnique({
      where: { stripeInvoiceId: data.stripeInvoiceId }
    });

    if (existing) {
      console.log(`✅ Facture déjà existante: ${existing.invoiceNumber}`);
      return existing;
    }
  }

  // Générer un numéro de facture unique
  const invoiceNumber = await generateInvoiceNumber();

  // Créer la facture
  const invoice = await prisma.invoice.create({
    data: {
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      invoiceNumber,
      stripeInvoiceId: data.stripeInvoiceId,
      status: data.paidAt ? 'paid' : 'pending',
      planId: data.planId,
      planName: data.planName,
      billing: data.billing,
      amount: data.amount,
      currency: data.currency || 'eur',
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      paidAt: data.paidAt || new Date(),
      transactionId: data.transactionId,
      paymentMethod: data.paymentMethod,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
    }
  });

  console.log(`✅ Facture créée: ${invoice.invoiceNumber} pour ${data.customerEmail}`);

  return invoice;
}

/**
 * Récupérer les factures d'un utilisateur
 */
export async function getUserInvoices(userId: string) {
  return await prisma.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Récupérer une facture par son numéro
 */
export async function getInvoiceByNumber(invoiceNumber: string) {
  return await prisma.invoice.findUnique({
    where: { invoiceNumber },
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      }
    }
  });
}

/**
 * Générer le contenu HTML d'une facture pour téléchargement
 */
export function generateInvoiceHTML(invoice: {
  invoiceNumber: string;
  planName: string;
  billing: string;
  amount: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  paidAt: Date | null;
  transactionId: string | null;
  paymentMethod: string | null;
  customerEmail: string;
  customerName: string | null;
  status: string;
}): string {
  const amountFormatted = (invoice.amount / 100).toFixed(2);
  const currencySymbol = invoice.currency === 'eur' ? '€' : invoice.currency.toUpperCase();

  const startDate = new Date(invoice.periodStart).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const endDate = new Date(invoice.periodEnd).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const paidDate = invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'En attente';

  const billingLabel = invoice.billing === 'yearly' ? 'Annuel' : 'Mensuel';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #ffffff;
      padding: 40px 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: #6366f1;
    }
    .invoice-number {
      text-align: right;
    }
    .invoice-number h1 {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 4px;
    }
    .invoice-number p {
      font-size: 14px;
      color: #6b7280;
    }
    .section {
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
    .info-block h3 {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .info-block p {
      font-size: 15px;
      color: #1f2937;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
    }
    thead {
      background-color: #f9fafb;
    }
    thead th {
      padding: 12px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    tbody td {
      padding: 16px 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 15px;
      color: #1f2937;
    }
    .total-row {
      background-color: #f9fafb;
      font-weight: 700;
    }
    .total-row td {
      padding: 16px 12px;
      font-size: 18px;
      border-top: 2px solid #e5e7eb;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
    .status-paid {
      background-color: #dcfce7;
      color: #166534;
    }
    .status-pending {
      background-color: #fef3c7;
      color: #92400e;
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 13px;
      color: #6b7280;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">MailClean</div>
      <div class="invoice-number">
        <h1>FACTURE</h1>
        <p>${invoice.invoiceNumber}</p>
      </div>
    </div>

    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-block">
        <h3>ÉMETTEUR</h3>
        <p>
          MailClean<br>
          Email: support@mailclean.app
        </p>
      </div>
      <div class="info-block">
        <h3>CLIENT</h3>
        <p>
          ${invoice.customerName || 'N/A'}<br>
          ${invoice.customerEmail}
        </p>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-block">
        <h3>DATE DE PAIEMENT</h3>
        <p>${paidDate}</p>
      </div>
      <div class="info-block">
        <h3>PÉRIODE</h3>
        <p>${startDate} - ${endDate}</p>
      </div>
    </div>

    ${invoice.transactionId ? `
    <div class="section">
      <div class="section-title">Transaction</div>
      <p style="font-family: monospace; font-size: 13px; color: #6b7280;">${invoice.transactionId}</p>
    </div>
    ` : ''}

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th>DESCRIPTION</th>
          <th style="text-align: center;">PÉRIODE</th>
          <th style="text-align: right;">MONTANT</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            Abonnement MailClean ${invoice.planName}<br>
            <span style="font-size: 13px; color: #6b7280;">Plan ${billingLabel}</span>
          </td>
          <td style="text-align: center;">
            <span class="status ${invoice.status === 'paid' ? 'status-paid' : 'status-pending'}">
              ${invoice.status === 'paid' ? 'PAYÉ' : 'EN ATTENTE'}
            </span>
          </td>
          <td style="text-align: right;">${amountFormatted} ${currencySymbol}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2">TOTAL</td>
          <td style="text-align: right;">${amountFormatted} ${currencySymbol}</td>
        </tr>
      </tbody>
    </table>

    ${invoice.paymentMethod ? `
    <div class="section">
      <div class="section-title">Moyen de paiement</div>
      <p>${invoice.paymentMethod === 'card' ? 'Carte bancaire' : invoice.paymentMethod.toUpperCase()}</p>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p>© ${new Date().getFullYear()} MailClean. Tous droits réservés.</p>
      <p style="margin-top: 8px;">Cette facture est générée électroniquement et ne nécessite pas de signature.</p>
    </div>
  </div>
</body>
</html>
  `;
}
