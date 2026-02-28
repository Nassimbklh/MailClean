"use client";

import { useState } from "react";

interface SenderAvatarProps {
  senderName?: string;
  senderEmail: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Composant SenderAvatar
 *
 * Affiche un avatar pour un expéditeur :
 * 1. Tente de charger le favicon du domaine via Google
 * 2. Fallback vers DuckDuckGo si Google échoue
 * 3. Fallback final : cercle coloré avec initiale (nom ou domaine)
 *
 * La couleur est stable (basée sur un hash du domaine)
 * Ne jamais afficher d'image cassée
 */
export default function SenderAvatar({
  senderName,
  senderEmail,
  size = "md",
  className = "",
}: SenderAvatarProps) {
  const [imageSource, setImageSource] = useState<"google" | "duckduckgo" | "fallback">("google");
  const [imageLoaded, setImageLoaded] = useState(false);

  // Extraire le domaine de l'email
  const extractDomain = (email: string): string => {
    const match = email.match(/@(.+)$/);
    if (!match) return email;

    let domain = match[1];

    // Supprimer www. si présent
    domain = domain.replace(/^www\./, "");

    return domain;
  };

  const domain = extractDomain(senderEmail);

  // Obtenir l'initiale : priorité au nom, sinon première lettre du domaine
  const getInitial = (): string => {
    if (senderName && senderName.trim().length > 0) {
      // Prendre la première lettre du nom
      return senderName.trim().charAt(0).toUpperCase();
    }

    // Sinon, prendre la première lettre du domaine (sans www)
    const cleanDomain = domain.replace(/^www\./, "");
    return cleanDomain.charAt(0).toUpperCase();
  };

  const initial = getInitial();

  // Générer une couleur stable basée sur le hash du domaine
  const getColorFromDomain = (domain: string): string => {
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      hash = domain.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }

    const colors = [
      "bg-blue-500",
      "bg-indigo-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-red-500",
      "bg-orange-500",
      "bg-amber-500",
      "bg-yellow-500",
      "bg-lime-500",
      "bg-green-500",
      "bg-emerald-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-sky-500",
      "bg-violet-500",
      "bg-fuchsia-500",
      "bg-rose-500",
    ];

    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const bgColor = getColorFromDomain(domain);

  // Tailles
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const sizePixels = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  // Gérer l'erreur de chargement de l'image
  const handleImageError = () => {
    if (imageSource === "google") {
      // Essayer DuckDuckGo
      setImageSource("duckduckgo");
      setImageLoaded(false);
    } else if (imageSource === "duckduckgo") {
      // Les deux ont échoué, utiliser le fallback
      setImageSource("fallback");
      setImageLoaded(false);
    }
  };

  // Gérer le chargement réussi de l'image
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Si on doit afficher le fallback (cercle coloré)
  if (imageSource === "fallback") {
    return (
      <div
        className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
        title={`${senderName || domain}`}
      >
        {initial}
      </div>
    );
  }

  // URLs des favicons
  const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${sizePixels[size]}`;
  const duckDuckGoFaviconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;

  const faviconUrl = imageSource === "google" ? googleFaviconUrl : duckDuckGoFaviconUrl;

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex-shrink-0 ${className}`}
      title={`${senderName || domain}`}
    >
      {/* Afficher le cercle coloré en arrière-plan si l'image ne s'est pas encore chargée */}
      {!imageLoaded && (
        <div
          className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-bold`}
        >
          {initial}
        </div>
      )}

      {/* Image favicon - affichée uniquement si chargée avec succès */}
      <img
        src={faviconUrl}
        alt={senderName || domain}
        onError={handleImageError}
        onLoad={handleImageLoad}
        className={`${sizeClasses[size]} rounded-full object-cover bg-white dark:bg-gray-800 ${
          imageLoaded ? "block" : "hidden"
        }`}
      />
    </div>
  );
}
