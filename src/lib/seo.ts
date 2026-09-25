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

export const SITE_URL = "https://www.delizza.fr";

export const BUSINESS = {
  name: "Pizza Deli'Zza",
  legalName: "Pizza Deli'Zza",
  url: SITE_URL,
  telephone: "02 21 68 81 82",
  email: "contact@delizza.fr",
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
  servesCuisine: "Pizza",
  description:
    "Pizzeria à emporter à La Varenne (Orée d'Anjou). Pizzas préparées à la commande, ingrédients sélectionnés avec soin et retrait en click & collect.",
  shortDescription:
    "Pizza Deli'Zza à La Varenne, Orée d'Anjou : découvrez la carte et commandez vos pizzas à emporter en click & collect.",
  openingHours: [
    // Wednesday-Sunday evenings only
    { dayOfWeek: ["Wednesday", "Thursday"], opens: "18:30", closes: "21:30" },
    { dayOfWeek: ["Friday", "Saturday", "Sunday"], opens: "18:30", closes: "22:00" },
  ],
  openingHoursText: "Mer-Jeu : 18h30-21h30 / Ven-Dim : 18h30-22h00",
} as const;

export const LEGAL_ENTITY = {
  denomination: "DELIZZA",
  legalForm: "EURL / SARL à associé unique",
  shareCapital: "1 €",
  siren: "102 421 732",
  siret: "102 421 732 00011",
  apeCode: "5610C",
  publicationDirector: "Alexandre Stéphane Gérard Magré",
  publicationDirectorRole: "Gérant de DELIZZA",
  email: "contact@delizza.fr",
  telephone: "02 21 68 81 82",
  registeredOffice: {
    streetAddress: "9076 Route d’Anjou",
    postalCode: "49270",
    addressLocality: "Orée d’Anjou",
    addressCountry: "France",
  },
  host: {
    name: "Vercel Inc.",
    streetAddress: "440 N Barranca Ave #4133",
    addressLocality: "Covina, CA 91723",
    addressCountry: "États-Unis",
    website: "https://vercel.com",
  },
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
  /** Short directions / access paragraph */
  access: string;
  /** Pickup information */
  landmarks: string;
  /** Short unique intro sentence about the commune */
  intro: string;
}

export const COMMUNES: Commune[] = [
  {
    slug: "pizza-la-varenne",
    name: "La Varenne",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "À La Varenne, retrouvez Pizza Deli'Zza au 98 Place du Jardin Public. Consultez la carte et choisissez vos pizzas à emporter.",
  },
  {
    slug: "pizzeria-la-varenne",
    name: "La Varenne",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Vous cherchez une pizzeria à La Varenne ? Chez Pizza Deli'Zza, chaque pizza est préparée à la commande. Choisissez votre recette et votre créneau de retrait.",
  },
  {
    slug: "pizza-oree-danjou",
    name: "Orée d'Anjou",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Pour votre soirée pizza à Orée d'Anjou, découvrez la carte de Pizza Deli'Zza. Le retrait de votre commande se fait à La Varenne.",
  },
  {
    slug: "pizza-saint-florent-le-vieil",
    name: "Saint-Florent-le-Vieil",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Une envie de pizza depuis Saint-Florent-le-Vieil ? Consultez le menu de Pizza Deli'Zza et organisez votre retrait au 98 Place du Jardin Public à La Varenne.",
  },
  {
    slug: "pizza-champtoceaux",
    name: "Champtoceaux",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Depuis Champtoceaux, préparez votre soirée autour des pizzas de Deli'Zza. Parcourez les recettes en ligne, puis venez chercher votre commande à La Varenne.",
  },
  {
    slug: "pizza-landemont",
    name: "Landemont",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Vous êtes à Landemont ? Découvrez les pizzas à emporter de Deli'Zza et choisissez un créneau de retrait à La Varenne avant de vous déplacer.",
  },
  {
    slug: "pizza-liré",
    name: "Liré",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Pour les amateurs de pizza à Liré, la carte de Deli'Zza se consulte en ligne. Composez votre commande et retrouvez-nous à La Varenne pour le retrait.",
  },
  {
    slug: "pizza-drain",
    name: "Drain",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Depuis Drain, choisissez vos pizzas sur le menu Deli'Zza. La commande se prépare en ligne et se récupère à notre pizzeria de La Varenne.",
  },

  /* ── Communes déléguées d'Orée d'Anjou ── */

  {
    slug: "pizza-bouzille",
    name: "Bouzillé",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Une soirée pizza en perspective à Bouzillé ? Découvrez les recettes Deli'Zza et prévoyez votre passage à La Varenne au créneau choisi.",
  },
  {
    slug: "pizza-saint-christophe-la-couperie",
    name: "Saint-Christophe-la-Couperie",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Vous habitez Saint-Christophe-la-Couperie ? Parcourez la carte Deli'Zza pour composer votre commande de pizzas à retirer à La Varenne.",
  },
  {
    slug: "pizza-saint-laurent-des-autels",
    name: "Saint-Laurent-des-Autels",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Depuis Saint-Laurent-des-Autels, retrouvez en ligne les pizzas proposées par Deli'Zza. Choisissez vos recettes et votre créneau pour un retrait à La Varenne.",
  },
  {
    slug: "pizza-saint-sauveur-de-landemont",
    name: "Saint-Sauveur-de-Landemont",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Pour une pause pizza depuis Saint-Sauveur-de-Landemont, consultez le menu Deli'Zza. Votre commande est à retirer au 98 Place du Jardin Public à La Varenne.",
  },

  /* ── Communes voisines ── */

  {
    slug: "pizza-la-remaudiere",
    name: "La Remaudière",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "À La Remaudière et envie de pizzas à emporter ? Découvrez Deli'Zza, sa carte en ligne et son retrait en click & collect à La Varenne.",
  },
  {
    slug: "pizza-la-pommeraye",
    name: "La Pommeraye",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Organisez votre commande depuis La Pommeraye avec le menu Deli'Zza. Les pizzas sont préparées à la commande et se récupèrent à La Varenne.",
  },
  {
    slug: "pizza-la-chapelle-saint-florent",
    name: "La Chapelle-Saint-Florent",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Depuis La Chapelle-Saint-Florent, faites votre choix parmi les pizzas Deli'Zza. Retrouvez sur cette page les informations pour un retrait à La Varenne.",
  },
  {
    slug: "pizza-le-marillais",
    name: "Le Marillais",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Pour votre repas depuis Le Marillais, découvrez la carte de pizzas Deli'Zza. Commandez en ligne et venez chercher vos pizzas à La Varenne.",
  },
  {
    slug: "pizza-oudon",
    name: "Oudon",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Vous êtes à Oudon ? Explorez le menu de Pizza Deli'Zza pour votre prochaine soirée pizza. Le click & collect vous donne rendez-vous à La Varenne.",
  },
  {
    slug: "pizza-ancenis",
    name: "Ancenis-Saint-Géréon",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Depuis Ancenis-Saint-Géréon, consultez les pizzas à emporter de Deli'Zza. Choisissez votre commande en ligne et prévoyez un retrait à La Varenne.",
  },
  {
    slug: "pizza-le-fuilet",
    name: "Le Fuilet",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Envie de partager des pizzas depuis Le Fuilet ? Découvrez les recettes Deli'Zza, à commander en ligne et à retirer à La Varenne.",
  },
  {
    slug: "pizza-mauges-sur-loire",
    name: "Mauges-sur-Loire",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Depuis Mauges-sur-Loire, préparez votre commande de pizzas Deli'Zza sur le site. Notre point de retrait se situe à La Varenne, à Orée d'Anjou.",
  },

  /* ── Variantes pizzeria- pour les communes principales ── */

  {
    slug: "pizzeria-ancenis",
    name: "Ancenis-Saint-Géréon",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Vous recherchez une pizzeria à emporter depuis Ancenis-Saint-Géréon ? Deli'Zza vous propose de choisir vos pizzas en ligne pour un retrait à La Varenne.",
  },
  {
    slug: "pizzeria-champtoceaux",
    name: "Champtoceaux",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Depuis Champtoceaux, découvrez la pizzeria Deli'Zza et son click & collect à La Varenne. Composez votre commande autour des recettes de la carte.",
  },
  {
    slug: "pizzeria-drain",
    name: "Drain",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Pour commander des pizzas depuis Drain, rendez-vous sur le menu Deli'Zza. Notre pizzeria vous remet votre commande à La Varenne au créneau prévu.",
  },
  {
    slug: "pizzeria-saint-florent-le-vieil",
    name: "Saint-Florent-le-Vieil",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Depuis Saint-Florent-le-Vieil, découvrez le fonctionnement du click & collect Deli'Zza : choix des pizzas en ligne et retrait à la pizzeria de La Varenne.",
  },
  {
    slug: "pizzeria-oree-danjou",
    name: "Orée d'Anjou",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Deli'Zza, pizzeria à Orée d'Anjou, vous accueille pour le retrait de vos pizzas à La Varenne. Consultez la carte et les informations pratiques pour préparer votre commande.",
  },
  {
    slug: "pizzeria-oudon",
    name: "Oudon",
    access:
      "Pour votre itinéraire, utilisez l'adresse du point de retrait : 98 Place du Jardin Public, La Varenne, 49270 Orée d'Anjou.",
    landmarks:
      "Prévoyez votre déplacement en fonction du créneau de retrait choisi lors de la commande.",
    intro:
      "Vous cherchez une pizzeria pour une commande depuis Oudon ? Retrouvez la carte Deli'Zza et les informations de retrait au 98 Place du Jardin Public à La Varenne.",
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

/**
 * Returns up to 5 other commune pages (distinct names, in editorial order)
 * excluding the current commune. Used for internal linking chips.
 */
export function nearbyCommunes(slug: string): Commune[] {
  const currentName = communeBySlug(slug)?.name;
  const seenNames = new Set<string>();

  return COMMUNES.filter((c) => c.slug !== slug && c.name !== currentName)
    .filter((c) => {
      if (seenNames.has(c.name)) return false;
      seenNames.add(c.name);
      return true;
    })
    .slice(0, 5);
}
