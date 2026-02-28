import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation | MailClean",
  description: "Conditions générales d'utilisation de MailClean",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Conditions Générales d&apos;Utilisation
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Dernière mise à jour : 28 février 2026
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-8">

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. Acceptation des conditions
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                En accédant et en utilisant MailClean (&quot;le Service&quot;), vous acceptez d&apos;être lié par les présentes Conditions Générales d&apos;Utilisation (&quot;CGU&quot;).
              </p>
              <p>
                Si vous n&apos;acceptez pas ces conditions, veuillez ne pas utiliser le Service.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. Description du service
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                MailClean est un outil de gestion d&apos;emails qui vous permet de :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Scanner votre boîte Gmail pour identifier les expéditeurs récurrents</li>
                <li>Visualiser les statistiques de vos emails par expéditeur</li>
                <li>Supprimer en masse les emails d&apos;expéditeurs spécifiques</li>
                <li>Détecter et accéder aux liens de désabonnement</li>
                <li>Nettoyer votre boîte de réception efficacement</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Compte utilisateur et authentification
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                <strong>3.1. Connexion Google OAuth</strong>
                <br />
                Pour utiliser MailClean, vous devez vous connecter avec votre compte Google. Nous utilisons OAuth 2.0 pour sécuriser l&apos;accès.
              </p>
              <p>
                <strong>3.2. Autorisations requises</strong>
                <br />
                En vous connectant, vous autorisez MailClean à :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Lire les métadonnées de vos emails (expéditeur, date, sujet)</li>
                <li>Lire le contenu de vos emails (pour détecter les liens de désabonnement)</li>
                <li>Modifier et supprimer vos emails (uniquement sur votre action explicite)</li>
              </ul>
              <p>
                <strong>3.3. Révocation d&apos;accès</strong>
                <br />
                Vous pouvez révoquer l&apos;accès de MailClean à tout moment depuis votre{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  compte Google
                </a>
                .
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. Utilisation du service
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                <strong>4.1. Utilisation autorisée</strong>
                <br />
                Vous vous engagez à utiliser MailClean uniquement pour gérer vos propres emails Gmail.
              </p>
              <p>
                <strong>4.2. Utilisation interdite</strong>
                <br />
                Vous ne devez PAS :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Utiliser le Service pour envoyer du spam ou des emails non sollicités</li>
                <li>Tenter de contourner les limites de l&apos;API Gmail</li>
                <li>Utiliser le Service pour accéder aux comptes d&apos;autres personnes sans autorisation</li>
                <li>Utiliser le Service à des fins illégales ou frauduleuses</li>
                <li>Tenter de reverse-engineer, décompiler ou désassembler le Service</li>
                <li>Utiliser des scripts automatisés pour abuser du Service</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. Confidentialité et données
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                L&apos;utilisation de vos données personnelles est régie par notre{" "}
                <a
                  href="/privacy"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Politique de Confidentialité
                </a>
                .
              </p>
              <p>
                <strong>Points clés :</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Nous ne stockons PAS le contenu de vos emails</li>
                <li>Nous stockons uniquement les métadonnées nécessaires au fonctionnement du Service</li>
                <li>Vos données ne sont JAMAIS vendues à des tiers</li>
                <li>Vous pouvez supprimer votre compte et toutes vos données à tout moment</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. Abonnements et paiements
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                <strong>6.1. Plans disponibles</strong>
                <br />
                MailClean propose différents plans d&apos;abonnement (gratuit, Solo, Family, Pro).
              </p>
              <p>
                <strong>6.2. Paiements</strong>
                <br />
                Les paiements sont traités de manière sécurisée via Stripe. Nous ne stockons pas vos informations de carte bancaire.
              </p>
              <p>
                <strong>6.3. Renouvellement automatique</strong>
                <br />
                Les abonnements payants se renouvellent automatiquement à moins que vous ne les annuliez avant la date de renouvellement.
              </p>
              <p>
                <strong>6.4. Annulation et remboursements</strong>
                <br />
                Vous pouvez annuler votre abonnement à tout moment depuis votre espace compte. Les remboursements sont traités au cas par cas. Contactez-nous à{" "}
                <a
                  href="mailto:support@mailclean.com"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  support@mailclean.com
                </a>
                .
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              7. Limitations de responsabilité
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                <strong>7.1. Service fourni &quot;en l&apos;état&quot;</strong>
                <br />
                MailClean est fourni &quot;en l&apos;état&quot; et &quot;selon disponibilité&quot;, sans garantie d&apos;aucune sorte, expresse ou implicite.
              </p>
              <p>
                <strong>7.2. Suppression d&apos;emails</strong>
                <br />
                Vous êtes seul responsable des actions effectuées avec MailClean. La suppression d&apos;emails est IRRÉVERSIBLE. Nous vous recommandons de vérifier soigneusement avant de confirmer toute suppression.
              </p>
              <p>
                <strong>7.3. Disponibilité du service</strong>
                <br />
                Nous nous efforçons de maintenir le Service disponible 24h/24, 7j/7, mais nous ne garantissons pas une disponibilité ininterrompue. Le Service peut être temporairement indisponible pour maintenance ou mises à jour.
              </p>
              <p>
                <strong>7.4. Limitation de responsabilité</strong>
                <br />
                En aucun cas MailClean ne sera responsable de dommages indirects, accessoires, spéciaux, consécutifs ou punitifs résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser le Service.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              8. Limites de l&apos;API Gmail
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                MailClean respecte les limites de quota imposées par l&apos;API Gmail de Google. En cas de dépassement de quota :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Le scan sera automatiquement mis en pause</li>
                <li>Vous serez informé du délai d&apos;attente avant reprise</li>
                <li>Le Service reprendra automatiquement dès que possible</li>
              </ul>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              9. Propriété intellectuelle
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                Tous les droits de propriété intellectuelle relatifs au Service (code source, design, logos, marques) appartiennent à MailClean ou ses concédants de licence.
              </p>
              <p>
                Vous ne pouvez pas copier, modifier, distribuer, vendre ou louer une partie du Service sans autorisation écrite préalable.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              10. Suspension et résiliation
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                <strong>10.1. Résiliation par l&apos;utilisateur</strong>
                <br />
                Vous pouvez supprimer votre compte à tout moment depuis les paramètres. Toutes vos données seront supprimées dans les 30 jours.
              </p>
              <p>
                <strong>10.2. Suspension par MailClean</strong>
                <br />
                Nous nous réservons le droit de suspendre ou résilier votre accès au Service si vous violez ces CGU, sans préavis ni remboursement.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              11. Modifications des CGU
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                Nous pouvons modifier ces CGU à tout moment. Les modifications prendront effet dès leur publication sur cette page.
              </p>
              <p>
                Votre utilisation continue du Service après publication des modifications constitue votre acceptation des nouvelles CGU.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              12. Droit applicable et juridiction
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                Ces CGU sont régies par le droit français. Tout litige relatif à l&apos;interprétation ou l&apos;exécution des présentes sera soumis aux tribunaux compétents de Paris, France.
              </p>
            </div>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              13. Contact
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                Pour toute question concernant ces Conditions Générales d&apos;Utilisation, veuillez nous contacter :
              </p>
              <ul className="list-none ml-4 space-y-2">
                <li>
                  <strong>Email :</strong>{" "}
                  <a
                    href="mailto:support@mailclean.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    support@mailclean.com
                  </a>
                </li>
                <li>
                  <strong>Formulaire de contact :</strong>{" "}
                  <a
                    href="/contact"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    /contact
                  </a>
                </li>
              </ul>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              © 2026 MailClean. Tous droits réservés.
            </p>
          </div>
        </div>

        {/* Back button */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    </div>
  );
}
