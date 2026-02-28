/**
 * Map des labels français pour les routes de l'application
 * Utilisé pour la navigation, breadcrumbs, titres de pages, etc.
 */

export const ROUTE_LABELS: Record<string, string> = {
  // Pages publiques
  "/": "Accueil",
  "/pricing": "Tarifs",
  "/tarifs": "Tarifs",
  "/contact": "Contact",
  "/privacy": "Politique de confidentialité",

  // App routes (dashboard)
  "/dashboard": "Tableau de bord",
  "/dashboard-new": "Tableau de bord",

  // Account routes
  "/account": "Mon compte",
  "/account/billing": "Facturation",
  "/account/team": "Mon équipe",

  // Support & Legal
  "/support": "Support",
  "/legal/privacy": "Politique de confidentialité",
  "/legal/terms": "Conditions d'utilisation",
  "/legal/vdp": "Divulgation de vulnérabilités",

  // Admin routes
  "/admin": "Administration",
  "/admin/users": "Utilisateurs",
  "/admin/subscriptions": "Abonnements",
  "/admin/logs": "Logs",
  "/admin/promo-codes": "Codes promo",
  "/admin/test-emails": "Test emails",
};

/**
 * Récupère le label FR d'une route
 */
export function getRouteLabel(pathname: string): string {
  return ROUTE_LABELS[pathname] || pathname;
}

/**
 * Génère les metadata (title + description) pour une page
 */
export function getPageMetadata(pathname: string) {
  const label = getRouteLabel(pathname);
  const baseTitle = "CleanMail";

  const descriptions: Record<string, string> = {
    "/": "Reprenez le contrôle de votre boîte Gmail. Nettoyez, désabonnez-vous et organisez vos emails en quelques clics.",
    "/pricing": "Découvrez nos plans tarifaires : Solo, Famille et Pro. Choisissez l'abonnement qui vous convient.",
    "/tarifs": "Découvrez nos plans tarifaires : Solo, Famille et Pro. Choisissez l'abonnement qui vous convient.",
    "/contact": "Contactez l'équipe CleanMail. Une question, une suggestion ? Nous sommes à votre écoute.",
    "/privacy": "Politique de confidentialité de CleanMail. Vos données sont protégées et sécurisées.",
    "/dashboard": "Tableau de bord CleanMail. Gérez vos emails, expéditeurs et actions.",
    "/account/billing": "Gérez votre abonnement CleanMail, consultez vos factures et historique de paiements.",
    "/account/team": "Gérez votre équipe et les membres de votre compte CleanMail.",
  };

  const description = descriptions[pathname] || `${label} - CleanMail`;

  return {
    title: pathname === "/" ? baseTitle : `${label} - ${baseTitle}`,
    description,
  };
}

/**
 * Hook React pour récupérer le label de la route actuelle
 */
export function useRouteLabel(pathname?: string): string {
  // Si pas de pathname fourni, utiliser le pathname actuel via usePathname() dans le composant
  if (!pathname) return "";
  return getRouteLabel(pathname);
}
