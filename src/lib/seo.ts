/**
 * SEO constants & local-page data for Pizza Deli'Zza.
 *
 * All business information lives here so it can be referenced from
 * metadata helpers, JSON-LD generators and local-page templates
 * without duplication.
 */

/* ------------------------------------------------------------------ */
/*  Business information                                               */
/* ------------------------------------------------------------------ */

export const SITE_URL = "https://delizza.fr";

export const BUSINESS = {
  name: "Pizza Deli'Zza",
  legalName: "Pizza Deli'Zza",
  url: SITE_URL,
  telephone: "TODO_PHONE",
  email: "TODO_EMAIL",
  address: {
    streetAddress: "98 Place du Jardin Public",
    postalCode: "49270",
    addressLocality: "Orée d'Anjou",
    addressRegion: "Pays de la Loire",
    addressCountry: "FR",
  },
  geo: {
    latitude: "TODO_LAT",
    longitude: "TODO_LNG",
  },
  social: {
    instagram: "TODO_INSTAGRAM",
    facebook: "TODO_FACEBOOK",
  },
  priceRange: "€€",
  servesCuisine: "Pizza",
  description:
    "Pizzeria artisanale à emporter à La Varenne (Orée d'Anjou). Pâte à longue fermentation, ingrédients frais et locaux. Commande en ligne, click & collect.",
  shortDescription:
    "Pizza artisanale à emporter — La Varenne, Orée d'Anjou. Pâte longue fermentation, fait maison, ingrédients locaux. Click & collect.",
  openingHours: [
    // Tuesday-Sunday, 11h–13h30 & 18h–22h
    { dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "11:00", closes: "13:30" },
    { dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "18:00", closes: "22:00" },
  ],
  openingHoursText: "Mar–Dim : 11h–13h30 / 18h–22h",
} as const;

/* ------------------------------------------------------------------ */
/*  OG defaults                                                        */
/* ------------------------------------------------------------------ */

export const OG_IMAGE = `${SITE_URL}/images/og-default.png`;

/* ------------------------------------------------------------------ */
/*  Local-page (service-area) communes                                 */
/* ------------------------------------------------------------------ */

export interface Commune {
  /** URL slug, e.g. "pizza-la-varenne" */
  slug: string;
  /** Display name for headings */
  name: string;
  /** Approximate drive time from the pizzeria */
  driveTime: string;
  /** Short directions / access paragraph */
  access: string;
  /** Local landmarks or parking tips */
  landmarks: string;
  /** Short unique intro sentence about the commune */
  intro: string;
}

export const COMMUNES: Commune[] = [
  {
    slug: "pizza-la-varenne",
    name: "La Varenne",
    driveTime: "0 min",
    access:
      "Pizza Deli'Zza est située en plein cœur de La Varenne, sur la Place du Jardin Public. Vous êtes ici chez nous !",
    landmarks:
      "Juste à côté du Jardin Public, avec un parking gratuit à proximité immédiate.",
    intro:
      "Habitants de La Varenne, votre pizzeria artisanale est à deux pas. Pas besoin de prendre la voiture : passez nous voir directement ou commandez en ligne pour un retrait express.",
  },
  {
    slug: "pizzeria-la-varenne",
    name: "La Varenne",
    driveTime: "0 min",
    access:
      "Située 98 Place du Jardin Public, notre pizzeria vous accueille au centre de La Varenne. Accès facile à pied ou en voiture.",
    landmarks:
      "Face au Jardin Public, places de stationnement gratuites devant la pizzeria.",
    intro:
      "Vous cherchez une pizzeria de qualité à La Varenne ? Pizza Deli'Zza prépare chaque pizza à la commande avec une pâte à longue fermentation et des ingrédients soigneusement sélectionnés.",
  },
  {
    slug: "pizza-oree-danjou",
    name: "Orée d'Anjou",
    driveTime: "5 min",
    access:
      "Depuis le centre d'Orée d'Anjou, rejoignez La Varenne en quelques minutes par la D210. Stationnement facile sur place.",
    landmarks:
      "La commune déléguée d'Orée d'Anjou regroupe plusieurs bourgs ; La Varenne est l'un des plus accessibles depuis tous les quartiers.",
    intro:
      "Orée d'Anjou, commune nouvelle des bords de Loire, mérite une pizzeria à la hauteur de son patrimoine. Pizza Deli'Zza vous propose des pizzas artisanales préparées avec des produits frais et locaux.",
  },
  {
    slug: "pizza-saint-florent-le-vieil",
    name: "Saint-Florent-le-Vieil",
    driveTime: "8 min",
    access:
      "Depuis Saint-Florent-le-Vieil, prenez la D751 direction La Varenne (environ 8 min). Traversez le pont sur la Loire et suivez les panneaux vers le centre.",
    landmarks:
      "Connu pour son abbaye et sa vue sur la Loire, Saint-Florent-le-Vieil est relié directement à La Varenne par la route départementale.",
    intro:
      "Habitants de Saint-Florent-le-Vieil, offrez-vous une pause gourmande avec les pizzas artisanales de Pizza Deli'Zza. En moins de 10 minutes, récupérez votre commande toute chaude grâce au click & collect.",
  },
  {
    slug: "pizza-champtoceaux",
    name: "Champtoceaux",
    driveTime: "7 min",
    access:
      "Depuis Champtoceaux, descendez vers la vallée par la D751 puis la D210. Comptez environ 7 minutes pour rejoindre la pizzeria.",
    landmarks:
      "Champtoceaux domine la Loire depuis son promontoire. Pizza Deli'Zza est facilement accessible en longeant le fleuve vers La Varenne.",
    intro:
      "Depuis les hauteurs de Champtoceaux, descendez jusqu'à La Varenne pour déguster nos pizzas artisanales. Pâte à longue fermentation, mozzarella filante et garnitures généreuses vous attendent.",
  },
  {
    slug: "pizza-landemont",
    name: "Landemont",
    driveTime: "10 min",
    access:
      "Depuis Landemont, empruntez la D154 puis la D210 vers La Varenne. Trajet d'environ 10 minutes dans la campagne angevine.",
    landmarks:
      "Landemont, petit bourg tranquille au sud d'Orée d'Anjou, est à portée de pizza pour une soirée réussie.",
    intro:
      "Même depuis Landemont, vos pizzas préférées ne sont qu'à 10 minutes. Commandez en ligne sur delizza.fr et récupérez votre commande à La Varenne sans attente.",
  },
  {
    slug: "pizza-liré",
    name: "Liré",
    driveTime: "6 min",
    access:
      "Depuis Liré, suivez la D751 direction La Varenne. En moins de 6 minutes, vous êtes devant la pizzeria.",
    landmarks:
      "Liré, patrie du poète Joachim du Bellay, est l'un des bourgs les plus proches de notre pizzeria. Parking aisé à l'arrivée.",
    intro:
      "Amateurs de bonne cuisine à Liré, découvrez Pizza Deli'Zza ! Nos pizzas sont préparées avec une pâte fermentée pendant 48 heures minimum pour un résultat aérien et croustillant.",
  },
  {
    slug: "pizza-drain",
    name: "Drain",
    driveTime: "5 min",
    access:
      "Drain est à seulement 5 minutes de La Varenne par la D210. Un trajet rapide pour une pizza artisanale de qualité.",
    landmarks:
      "Situé juste au nord de La Varenne, Drain permet un accès direct et rapide à notre pizzeria.",
    intro:
      "Voisins de Drain, profitez de la proximité ! Pizza Deli'Zza est votre pizzeria artisanale de quartier. Commandez en click & collect et récupérez votre pizza en quelques minutes.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function communeBySlug(slug: string): Commune | undefined {
  return COMMUNES.find((c) => c.slug === slug);
}

/** All slugs – used by generateStaticParams */
export function allCommuneSlugs(): string[] {
  return COMMUNES.map((c) => c.slug);
}
