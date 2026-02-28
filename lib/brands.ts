// Bibliothèque des domaines connus pour améliorer les logos
// Cette liste aide à mapper les emails vers les bons domaines de marque

export const knownBrands: Record<string, { domain: string; name: string }> = {
  // E-commerce
  "amazon.com": { domain: "amazon.com", name: "Amazon" },
  "amazon.fr": { domain: "amazon.com", name: "Amazon" },
  "amazon.de": { domain: "amazon.com", name: "Amazon" },
  "ebay.com": { domain: "ebay.com", name: "eBay" },
  "ebay.fr": { domain: "ebay.com", name: "eBay" },
  "shein.com": { domain: "shein.com", name: "Shein" },
  "aliexpress.com": { domain: "aliexpress.com", name: "AliExpress" },
  "etsy.com": { domain: "etsy.com", name: "Etsy" },
  "wish.com": { domain: "wish.com", name: "Wish" },
  "zalando.fr": { domain: "zalando.com", name: "Zalando" },
  "zalando.com": { domain: "zalando.com", name: "Zalando" },

  // Social Media
  "facebook.com": { domain: "facebook.com", name: "Facebook" },
  "facebookmail.com": { domain: "facebook.com", name: "Facebook" },
  "instagram.com": { domain: "instagram.com", name: "Instagram" },
  "twitter.com": { domain: "twitter.com", name: "Twitter" },
  "x.com": { domain: "x.com", name: "X (Twitter)" },
  "linkedin.com": { domain: "linkedin.com", name: "LinkedIn" },
  "tiktok.com": { domain: "tiktok.com", name: "TikTok" },
  "snapchat.com": { domain: "snapchat.com", name: "Snapchat" },
  "pinterest.com": { domain: "pinterest.com", name: "Pinterest" },

  // Transport & Livraison
  "uber.com": { domain: "uber.com", name: "Uber" },
  "ubereats.com": { domain: "uber.com", name: "Uber Eats" },
  "deliveroo.com": { domain: "deliveroo.com", name: "Deliveroo" },
  "deliveroo.fr": { domain: "deliveroo.com", name: "Deliveroo" },
  "lyft.com": { domain: "lyft.com", name: "Lyft" },
  "blablacar.com": { domain: "blablacar.com", name: "BlaBlaCar" },
  "blablacar.fr": { domain: "blablacar.com", name: "BlaBlaCar" },

  // Services & Streaming
  "netflix.com": { domain: "netflix.com", name: "Netflix" },
  "spotify.com": { domain: "spotify.com", name: "Spotify" },
  "youtube.com": { domain: "youtube.com", name: "YouTube" },
  "apple.com": { domain: "apple.com", name: "Apple" },
  "google.com": { domain: "google.com", name: "Google" },
  "microsoft.com": { domain: "microsoft.com", name: "Microsoft" },
  "dropbox.com": { domain: "dropbox.com", name: "Dropbox" },

  // Banques & Finance
  "paypal.com": { domain: "paypal.com", name: "PayPal" },
  "stripe.com": { domain: "stripe.com", name: "Stripe" },
  "revolut.com": { domain: "revolut.com", name: "Revolut" },
  "n26.com": { domain: "n26.com", name: "N26" },

  // Voyage
  "airbnb.com": { domain: "airbnb.com", name: "Airbnb" },
  "booking.com": { domain: "booking.com", name: "Booking.com" },
  "expedia.com": { domain: "expedia.com", name: "Expedia" },
  "tripadvisor.com": { domain: "tripadvisor.com", name: "TripAdvisor" },
  "sncf.com": { domain: "sncf.com", name: "SNCF" },
  "ouisncf.com": { domain: "sncf.com", name: "SNCF" },

  // Mode & Retail
  "zara.com": { domain: "zara.com", name: "Zara" },
  "hm.com": { domain: "hm.com", name: "H&M" },
  "nike.com": { domain: "nike.com", name: "Nike" },
  "adidas.com": { domain: "adidas.com", name: "Adidas" },
  "uniqlo.com": { domain: "uniqlo.com", name: "Uniqlo" },

  // Tech & Outils
  "github.com": { domain: "github.com", name: "GitHub" },
  "gitlab.com": { domain: "gitlab.com", name: "GitLab" },
  "notion.so": { domain: "notion.so", name: "Notion" },
  "slack.com": { domain: "slack.com", name: "Slack" },
  "discord.com": { domain: "discord.com", name: "Discord" },
  "medium.com": { domain: "medium.com", name: "Medium" },
  "substack.com": { domain: "substack.com", name: "Substack" },
  "zoom.us": { domain: "zoom.us", name: "Zoom" },
  "trello.com": { domain: "trello.com", name: "Trello" },
  "asana.com": { domain: "asana.com", name: "Asana" },

  // News & Média
  "lemonde.fr": { domain: "lemonde.fr", name: "Le Monde" },
  "lefigaro.fr": { domain: "lefigaro.fr", name: "Le Figaro" },
  "liberation.fr": { domain: "liberation.fr", name: "Libération" },
  "mediapart.fr": { domain: "mediapart.fr", name: "Mediapart" },

  // Télécoms & Opérateurs
  "orange.fr": { domain: "orange.fr", name: "Orange" },
  "sfr.fr": { domain: "sfr.fr", name: "SFR" },
  "bouyguestelecom.fr": { domain: "bouyguestelecom.fr", name: "Bouygues Telecom" },
  "free.fr": { domain: "free.fr", name: "Free" },

  // Sport & Fitness
  "nike.com": { domain: "nike.com", name: "Nike" },
  "adidas.com": { domain: "adidas.com", name: "Adidas" },
  "decathlon.fr": { domain: "decathlon.com", name: "Decathlon" },
  "decathlon.com": { domain: "decathlon.com", name: "Decathlon" },

  // Alimentaire & Livraison
  "mcdonalds.com": { domain: "mcdonalds.com", name: "McDonald's" },
  "kfc.com": { domain: "kfc.com", name: "KFC" },
  "dominos.com": { domain: "dominos.com", name: "Domino's Pizza" },
  "subway.com": { domain: "subway.com", name: "Subway" },

  // Gaming
  "steam.com": { domain: "steampowered.com", name: "Steam" },
  "steampowered.com": { domain: "steampowered.com", name: "Steam" },
  "epicgames.com": { domain: "epicgames.com", name: "Epic Games" },
  "playstation.com": { domain: "playstation.com", name: "PlayStation" },
  "xbox.com": { domain: "xbox.com", name: "Xbox" },
  "nintendo.com": { domain: "nintendo.com", name: "Nintendo" },

  // E-learning
  "udemy.com": { domain: "udemy.com", name: "Udemy" },
  "coursera.org": { domain: "coursera.org", name: "Coursera" },
  "openclassrooms.com": { domain: "openclassrooms.com", name: "OpenClassrooms" },
};

// Obtenir les infos de marque à partir d'un domaine email
export function getBrandInfo(emailDomain: string): {
  domain: string;
  name: string;
} | null {
  const normalized = emailDomain.toLowerCase();
  return knownBrands[normalized] || null;
}

// Nettoyer et normaliser un nom d'expéditeur
export function cleanSenderName(name: string, email: string): string {
  // Si le nom est vide ou identique à l'email, extraire du domaine
  if (!name || name === email) {
    const domain = email.split("@")[1] || "";
    const brandInfo = getBrandInfo(domain);
    if (brandInfo) {
      return brandInfo.name;
    }
    // Sinon utiliser la partie avant le @
    return email.split("@")[0] || email;
  }

  return name;
}
