"use client";

import { useState } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    window.location.href = "/api/auth/google";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Une erreur est survenue");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Erreur de connexion. Veuillez réessayer.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <PublicNavbar
        showLogin={true}
        onLoginClick={handleLogin}
        isLoggingIn={isLoggingIn}
      />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Contactez-nous
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Une question, une suggestion, ou simplement envie d'échanger sur notre vision ?
            Nous sommes à votre écoute.
          </p>
        </div>

        {/* Notre Mission */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Notre Mission</h2>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Chez <strong>CleanMail</strong>, nous croyons fermement que votre boîte mail devrait être un outil au service
              de votre productivité, et non une source de stress quotidien.
            </p>

            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Chaque jour, des millions de personnes sont submergées par des centaines d'emails non désirés :
              newsletters oubliées, promotions incessantes, notifications automatiques... Ces distractions
              grignotent votre temps, votre attention et votre énergie.
            </p>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              Notre Vision 🌟
            </h3>

            <div className="grid md:grid-cols-2 gap-6 my-8">
              <div className="bg-blue-50 dark:bg-gray-700 p-6 rounded-xl border-l-4 border-blue-500">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Transparence totale
                </h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  Nous ne lisons jamais vos emails. Toutes les opérations se font via l'API Gmail de manière sécurisée.
                </p>
              </div>

              <div className="bg-green-50 dark:bg-gray-700 p-6 rounded-xl border-l-4 border-green-500">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Confidentialité garantie
                </h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  Vos données restent chez vous. Nous ne vendons aucune information à des tiers.
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-gray-700 p-6 rounded-xl border-l-4 border-purple-500">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Simplicité avant tout
                </h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  Une interface intuitive, sans courbe d'apprentissage. Résultats visibles en quelques clics.
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-gray-700 p-6 rounded-xl border-l-4 border-orange-500">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  Efficacité maximale
                </h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  Nettoyez des milliers d'emails en quelques minutes. Automatisation intelligente.
                </p>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Nous développons des outils qui vous permettent de <strong>reprendre le contrôle</strong> : analyses
              intelligentes, désabonnements en un clic, suppressions en masse, tout en respectant votre vie privée.
            </p>

            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Notre équipe travaille chaque jour pour améliorer CleanMail et créer l'expérience la plus fluide
              possible. Vos retours nous sont précieux pour continuer à innover dans le bon sens.
            </p>
          </div>
        </div>

        {/* Formulaire de contact */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Envoyez-nous un message</h2>
          </div>

          {status === "success" ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
                Message envoyé avec succès !
              </h3>
              <p className="text-green-700 dark:text-green-300 mb-4">
                Nous avons bien reçu votre message et vous répondrons dans les plus brefs délais.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {status === "error" && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-400 text-sm">
                    {errorMessage || "Une erreur est survenue. Veuillez réessayer."}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Votre nom *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    maxLength={100}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    placeholder="Jean Dupont"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Votre email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    placeholder="jean.dupont@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sujet *
                </label>
                <input
                  type="text"
                  id="subject"
                  required
                  maxLength={200}
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                  placeholder="Question sur les fonctionnalités premium"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Votre message *
                </label>
                <textarea
                  id="message"
                  required
                  maxLength={5000}
                  rows={8}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors resize-none"
                  placeholder="Décrivez votre demande, suggestion ou question en détail..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {formData.message.length} / 5000 caractères
                </p>
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                {status === "loading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Envoi en cours...
                  </span>
                ) : (
                  "Envoyer le message"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Contact alternatif */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Vous préférez nous écrire directement ?
          </p>
          <a
            href="mailto:contact@mailclean.com"
            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            contact@mailclean.com
          </a>
        </div>
      </div>
    </div>
  );
}
