"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header Navigation */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              MailClean
            </Link>
            <nav className="flex gap-6">
              <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Accueil
              </Link>
              <Link href="/pricing" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Tarifs
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[800px] mx-auto px-6 sm:px-8 py-12 sm:py-16">
        <article className="prose prose-lg max-w-none">
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Politique de Confidentialité et Conditions Générales d'Utilisation
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-12">
            Dernière mise à jour : 12 février 2026
          </p>

          <hr className="border-gray-200 dark:border-gray-700 mb-12" />

          {/* POLITIQUE DE CONFIDENTIALITÉ */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6">
            POLITIQUE DE CONFIDENTIALITÉ
          </h2>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              1. Introduction
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Bienvenue sur NomDuSite ("nous", "notre", "nos").
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              La protection de votre vie privée est une priorité. Cette politique explique comment nous collectons, utilisons et protégeons vos données lorsque vous utilisez notre service de nettoyage de boîte mail.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              En utilisant notre service, vous acceptez cette Politique de Confidentialité.
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              2. Données collectées
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Lorsque vous utilisez NomDuSite, nous pouvons collecter :
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2 ml-4">
              <li>Votre adresse email</li>
              <li>Les informations de connexion via OAuth (Google, Outlook, etc.)</li>
              <li>Les métadonnées de vos emails (expéditeur, destinataire, objet, date)</li>
              <li>Les informations techniques liées à votre session (cookies, navigateur)</li>
            </ul>
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-4">
              <p className="font-semibold text-gray-900 dark:text-white mb-2">IMPORTANT :</p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Nous ne lisons PAS le contenu des emails.<br />
                Nous ne téléchargeons PAS le corps des messages.<br />
                Nous analysons uniquement les métadonnées nécessaires au fonctionnement du service.
              </p>
            </div>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              3. Utilisation des données
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Vos données sont utilisées uniquement pour :
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2 ml-4">
              <li>Authentifier votre compte</li>
              <li>Accéder à votre boîte mail via connexion sécurisée</li>
              <li>Identifier les newsletters et emails groupés</li>
              <li>Vous permettre de supprimer ou vous désabonner</li>
              <li>Améliorer la performance du service</li>
            </ul>
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Nous ne vendons jamais vos données.<br />
                Nous ne louons jamais vos données.<br />
                Nous n'utilisons pas vos données à des fins publicitaires.<br />
                Nous ne partageons pas vos données avec des tiers à des fins marketing.
              </p>
            </div>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              4. Données Google et conformité Gmail API
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Si vous connectez un compte Gmail :
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2 ml-4">
              <li>Nous accédons uniquement aux métadonnées des emails</li>
              <li>Nous n'accédons pas au contenu des messages</li>
              <li>Nous n'utilisons pas ces données pour la publicité</li>
              <li>Nous ne transférons pas les données Gmail à des tiers</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Notre utilisation respecte la Google API Services User Data Policy et ses exigences de Limited Use.
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              5. Sécurité des données
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Nous mettons en place :
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2 ml-4">
              <li>Connexions chiffrées HTTPS</li>
              <li>Authentification sécurisée OAuth</li>
              <li>Infrastructure cloud sécurisée</li>
              <li>Accès restreint aux systèmes internes</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Nous ne stockons aucune information bancaire sur nos serveurs.
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              6. Conservation des données
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Votre compte reste actif tant que votre abonnement est actif.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Vous pouvez demander la suppression de votre compte à tout moment à :<br />
              <a href="mailto:contact@tonsite.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                contact@tonsite.com
              </a>
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Les données seront supprimées définitivement dans un délai maximal de 30 jours.
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              7. Cookies
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Nous utilisons des cookies uniquement pour :
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2 ml-4">
              <li>L'authentification</li>
              <li>La gestion de session</li>
              <li>Des statistiques anonymes</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Nous n'utilisons pas de cookies publicitaires.
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              8. Vos droits (RGPD)
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2 ml-4">
              <li>Droit d'accès</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement</li>
              <li>Droit d'opposition</li>
              <li>Droit à la portabilité</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Pour exercer vos droits :<br />
              <a href="mailto:contact@tonsite.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                contact@tonsite.com
              </a>
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              9. Protection des mineurs
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Le service est réservé aux personnes âgées de 18 ans et plus.
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              10. Modifications
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Nous pouvons modifier cette politique à tout moment. La version la plus récente sera toujours disponible sur cette page.
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-12" />

          {/* CONDITIONS GÉNÉRALES D'UTILISATION */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6">
            CONDITIONS GÉNÉRALES D'UTILISATION
          </h2>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              1. Acceptation
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              En utilisant NomDuSite, vous acceptez les présentes Conditions Générales d'Utilisation.
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              2. Description du service
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              NomDuSite propose des outils permettant de :
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2 ml-4">
              <li>Analyser les métadonnées d'emails</li>
              <li>Identifier les expéditeurs en masse</li>
              <li>Supprimer des emails</li>
              <li>Se désabonner de newsletters</li>
              <li>Organiser une boîte mail</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Nous n'hébergeons pas les emails.<br />
              Nous accédons uniquement aux données via API sécurisée.
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              3. Responsabilité utilisateur
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Vous êtes responsable :
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
              <li>De la sécurité de votre compte</li>
              <li>De la protection de votre accès email</li>
              <li>Des actions effectuées via votre compte</li>
            </ul>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              4. Utilisation interdite
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Il est interdit de :
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
              <li>Utiliser le service à des fins illégales</li>
              <li>Tenter de perturber le fonctionnement du site</li>
              <li>Tenter d'accéder aux systèmes internes</li>
              <li>Exploiter le service de manière abusive</li>
            </ul>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              5. Limitation de responsabilité
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Le service est fourni "en l'état".
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Nous ne garantissons pas une disponibilité continue ni l'absence totale d'erreurs.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Nous ne sommes pas responsables des suppressions d'emails effectuées par l'utilisateur.
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              6. Abonnement et paiement
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Les abonnements sont reconduits automatiquement sauf résiliation avant la date de renouvellement.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Vous pouvez annuler à tout moment avant le renouvellement.
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              7. Droit applicable
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Les présentes conditions sont régies par le droit français.<br />
              Tout litige relève de la compétence des tribunaux français.
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              8. Contact
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Pour toute question :<br />
              <a href="mailto:contact@tonsite.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                contact@tonsite.com
              </a>
            </p>
          </section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />
        </article>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                MailClean
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Nettoyez votre boîte mail en quelques clics
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Liens utiles
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                    Accueil
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                    Tarifs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Légal
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                    Politique de confidentialité
                  </Link>
                </li>
                <li>
                  <a href="mailto:contact@tonsite.com" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                    Nous contacter
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
              © {new Date().getFullYear()} MailClean. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
