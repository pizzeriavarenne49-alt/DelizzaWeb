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

  /* ── Communes déléguées d'Orée d'Anjou ── */

  {
    slug: "pizza-bouzille",
    name: "Bouzillé",
    driveTime: "8 min",
    access:
      "Depuis Bouzillé, rejoignez La Varenne par la D210 en direction d'Orée d'Anjou. Comptez environ 8 minutes de route à travers les bocages angevins.",
    landmarks:
      "Bouzillé borde la vallée de la Loire côté Anjou. La route vers La Varenne est directe et agréable, sans traversée de grande agglomération.",
    intro:
      "À Bouzillé, les soirées pizzas sont désormais à 8 minutes. Pizza Deli'Zza vous prépare des pizzas artisanales à pâte longue fermentation que vous récupérez directement à La Varenne.",
  },
  {
    slug: "pizza-saint-christophe-la-couperie",
    name: "Saint-Christophe-la-Couperie",
    driveTime: "10 min",
    access:
      "Depuis Saint-Christophe-la-Couperie, prenez la direction de La Varenne via la D751. Le trajet traverse un paysage rural typique du Maine-et-Loire et dure environ 10 minutes.",
    landmarks:
      "Saint-Christophe-la-Couperie, commune déléguée d'Orée d'Anjou, est nichée entre vignes et bocages. Le pont sur l'Evre permet de rejoindre facilement La Varenne.",
    intro:
      "Habitants de Saint-Christophe-la-Couperie, votre pizzeria artisanale est à moins de 10 minutes ! Commandez en ligne sur delizza.fr et récupérez vos pizzas fraîchement préparées à La Varenne.",
  },
  {
    slug: "pizza-saint-laurent-des-autels",
    name: "Saint-Laurent-des-Autels",
    driveTime: "12 min",
    access:
      "Depuis Saint-Laurent-des-Autels, empruntez la D751 vers l'est jusqu'à La Varenne. Une douzaine de minutes suffisent pour relier les deux communes d'Orée d'Anjou.",
    landmarks:
      "Saint-Laurent-des-Autels est connu pour ses vignobles et ses paysages de coteaux. Depuis le bourg, la route vers La Varenne longe de belles prairies angevines.",
    intro:
      "De Saint-Laurent-des-Autels jusqu'à La Varenne, il ne faut que 12 minutes pour récupérer vos pizzas artisanales chez Pizza Deli'Zza. Pâte à longue fermentation, ingrédients de qualité : une vraie récompense après la journée.",
  },
  {
    slug: "pizza-saint-sauveur-de-landemont",
    name: "Saint-Sauveur-de-Landemont",
    driveTime: "12 min",
    access:
      "Depuis Saint-Sauveur-de-Landemont, rejoignez La Varenne par la D154 puis la D210. Ce parcours d'une douzaine de minutes vous mène directement à notre pizzeria.",
    landmarks:
      "Saint-Sauveur-de-Landemont est situé dans les collines au sud d'Orée d'Anjou. La route descend agréablement vers la vallée pour rejoindre La Varenne.",
    intro:
      "Depuis Saint-Sauveur-de-Landemont, offrez-vous une pause gourmande avec les pizzas de Pizza Deli'Zza. À seulement 12 minutes, vous pouvez commander en ligne et récupérer votre commande fraîche et chaude.",
  },

  /* ── Communes voisines ── */

  {
    slug: "pizza-la-remaudiere",
    name: "La Remaudière",
    driveTime: "12 min",
    access:
      "Depuis La Remaudière (Loire-Atlantique), traversez la Loire par le pont de La Varenne pour rejoindre directement notre pizzeria. Comptez environ 12 minutes.",
    landmarks:
      "La Remaudière est un bourg tranquille du vignoble nantais, juste de l'autre côté de la Loire. Le pont de La Varenne est le lien le plus direct entre les deux communes.",
    intro:
      "Depuis La Remaudière, une courte traversée de la Loire suffit pour découvrir les pizzas artisanales de Pizza Deli'Zza. Commandez en click & collect et profitez d'une pizza faite maison à seulement 12 minutes de chez vous.",
  },
  {
    slug: "pizza-la-pommeraye",
    name: "La Pommeraye",
    driveTime: "12 min",
    access:
      "Depuis La Pommeraye, descendez vers la Loire par la D751 en direction de La Varenne. Le trajet dure environ 12 minutes en passant par les coteaux de Mauges-sur-Loire.",
    landmarks:
      "La Pommeraye domine les coteaux calcaires de la Loire. La descente vers La Varenne offre une belle vue sur le fleuve et ses îles avant d'arriver à notre pizzeria.",
    intro:
      "Depuis les hauteurs de La Pommeraye, venez déguster nos pizzas artisanales à pâte longue fermentation. Pizza Deli'Zza est votre pizzeria de référence à seulement 12 minutes en voiture.",
  },
  {
    slug: "pizza-la-chapelle-saint-florent",
    name: "La Chapelle-Saint-Florent",
    driveTime: "10 min",
    access:
      "Depuis La Chapelle-Saint-Florent, prenez la D751 direction La Varenne. En 10 minutes, vous longez la Loire avant d'arriver directement devant notre pizzeria.",
    landmarks:
      "La Chapelle-Saint-Florent borde la Loire côté Mauges. La route vers La Varenne est panoramique et passe à proximité des rochers de la Loire ligérienne.",
    intro:
      "Depuis La Chapelle-Saint-Florent, Pizza Deli'Zza n'est qu'à 10 minutes. Commandez vos pizzas artisanales en ligne et récupérez-les fraîches à La Varenne : pâte croustillante, ingrédients frais, fait maison.",
  },
  {
    slug: "pizza-le-marillais",
    name: "Le Marillais",
    driveTime: "12 min",
    access:
      "Depuis Le Marillais, rejoignez La Varenne par la D751 en longeant la Loire. Le trajet d'une douzaine de minutes traverse les marais ligériens et arrive directement à notre pizzeria.",
    landmarks:
      "Le Marillais est un petit bourg de la Loire angevine, connu pour ses prairies humides et sa vue sur le fleuve. La route vers La Varenne longe les bords de Loire.",
    intro:
      "Le Marillais est à 12 minutes de la meilleure pizza artisanale de la région ! Pizza Deli'Zza vous accueille à La Varenne avec des pizzas préparées à la commande, pâte à longue fermentation et ingrédients locaux.",
  },
  {
    slug: "pizza-oudon",
    name: "Oudon",
    driveTime: "15 min",
    access:
      "Depuis Oudon (Loire-Atlantique), traversez la Loire par le pont d'Oudon et rejoignez La Varenne par la D751. Comptez environ 15 minutes pour ce trajet entre les deux rives.",
    landmarks:
      "Oudon est célèbre pour sa Tour médiévale qui domine la Loire. Depuis la rive nord, La Varenne est visible de l'autre côté du fleuve. Notre pizzeria est facilement accessible après la traversée du pont.",
    intro:
      "Habitants d'Oudon, votre pizzeria artisanale préférée est à 15 minutes. Pizza Deli'Zza vous propose des pizzas faites maison avec une pâte à longue fermentation. Commandez en ligne et récupérez votre commande à La Varenne.",
  },
  {
    slug: "pizza-ancenis",
    name: "Ancenis-Saint-Géréon",
    driveTime: "20 min",
    access:
      "Depuis Ancenis, prenez la D923 direction Varades puis la D751 vers La Varenne. Ce trajet d'une vingtaine de minutes vous conduit jusqu'à notre pizzeria artisanale.",
    landmarks:
      "Ancenis-Saint-Géréon est la ville principale du Pays d'Ancenis. Malgré la distance de 20 minutes, de nombreux habitants d'Ancenis font le déplacement pour nos pizzas artisanales à pâte longue fermentation.",
    intro:
      "Depuis Ancenis, la meilleure pizza artisanale des bords de Loire est à seulement 20 minutes ! Pizza Deli'Zza prépare chaque pizza à la commande avec une pâte fermentée 48 heures, de la mozzarella filante et des produits locaux.",
  },
  {
    slug: "pizza-le-fuilet",
    name: "Le Fuilet",
    driveTime: "14 min",
    access:
      "Depuis Le Fuilet, rejoignez La Varenne par la D961 puis la D210. Ce trajet d'environ 14 minutes traverse les terres de Montrevault-sur-Èvre.",
    landmarks:
      "Le Fuilet est une commune de la région des Mauges, connue pour ses paysages bocagers. La route vers La Varenne descend vers la Loire en passant par les collines angevines.",
    intro:
      "Depuis Le Fuilet, offrez-vous une vraie pizza artisanale à seulement 14 minutes. Pizza Deli'Zza vous prépare des pizzas maison avec une pâte à longue fermentation, des légumes frais et une charcuterie sélectionnée.",
  },
  {
    slug: "pizza-mauges-sur-loire",
    name: "Mauges-sur-Loire",
    driveTime: "12 min",
    access:
      "Depuis Mauges-sur-Loire (La Pommeraye, La Chapelle-Saint-Florent…), rejoignez La Varenne par la D751. Selon votre point de départ, comptez 10 à 15 minutes.",
    landmarks:
      "Mauges-sur-Loire regroupe plusieurs communes déléguées en bord de Loire. La Varenne est accessible depuis tous les bourgs en moins de 15 minutes par les routes départementales.",
    intro:
      "Depuis Mauges-sur-Loire, Pizza Deli'Zza est votre pizzeria artisanale de proximité. Commandez en ligne et récupérez vos pizzas fraîches à La Varenne : pâte maison, ingrédients de qualité, tout fait sur place.",
  },

  /* ── Variantes pizzeria- pour les communes principales ── */

  {
    slug: "pizzeria-ancenis",
    name: "Ancenis-Saint-Géréon",
    driveTime: "20 min",
    access:
      "Depuis Ancenis, suivez la D923 vers Varades puis la D751 longeant la Loire jusqu'à La Varenne. En 20 minutes, vous rejoignez directement notre pizzeria artisanale.",
    landmarks:
      "Ancenis-Saint-Géréon dispose d'un château médiéval et d'un bord de Loire agréable. Notre pizzeria est facilement identifiable Place du Jardin Public à La Varenne.",
    intro:
      "Vous cherchez une pizzeria artisanale à emporter près d'Ancenis ? Pizza Deli'Zza est à 20 minutes et vaut vraiment le déplacement : pâte à longue fermentation, ingrédients frais, fait maison sans exception.",
  },
  {
    slug: "pizzeria-champtoceaux",
    name: "Champtoceaux",
    driveTime: "7 min",
    access:
      "Depuis le bourg de Champtoceaux, descendez par la D751 en direction de La Varenne. En 7 minutes à peine, vous êtes devant notre pizzeria artisanale.",
    landmarks:
      "Champtoceaux domine la Loire depuis son promontoire naturel. Le chemin de ronde et le panorama sur le fleuve en font un endroit unique, à deux pas de Pizza Deli'Zza.",
    intro:
      "Vous êtes à Champtoceaux et vous cherchez une pizzeria sérieuse ? Pizza Deli'Zza est à 7 minutes. Pâte à longue fermentation, garnitures généreuses, cuisson maîtrisée : venez voir la différence.",
  },
  {
    slug: "pizzeria-drain",
    name: "Drain",
    driveTime: "5 min",
    access:
      "Drain est à 5 minutes seulement de La Varenne par la D210. La route est simple et directe, sans détour.",
    landmarks:
      "Drain surplombe la vallée de la Loire avec ses vignes et ses chemins de randonnée. La Varenne, en contrebas, est le point d'ancrage de notre pizzeria artisanale.",
    intro:
      "Votre pizzeria artisanale à Drain ? C'est Pizza Deli'Zza, à 5 minutes à peine. Pâte fermentée, mozzarella de qualité et cuisson au four : tous les ingrédients d'une bonne soirée.",
  },
  {
    slug: "pizzeria-saint-florent-le-vieil",
    name: "Saint-Florent-le-Vieil",
    driveTime: "8 min",
    access:
      "Depuis Saint-Florent-le-Vieil, empruntez la D751 direction La Varenne. Traversez la Loire et comptez environ 8 minutes pour rejoindre notre pizzeria.",
    landmarks:
      "Saint-Florent-le-Vieil est une ville chargée d'histoire, avec son abbaye sur le coteau et son quai sur la Loire. Pizza Deli'Zza est votre pizzeria artisanale à portée de main.",
    intro:
      "Depuis Saint-Florent-le-Vieil, vous méritez une vraie pizzeria artisanale. Pizza Deli'Zza est à 8 minutes, avec des pizzas préparées à la commande et une pâte longue fermentation qui change tout.",
  },
  {
    slug: "pizzeria-oree-danjou",
    name: "Orée d'Anjou",
    driveTime: "5 min",
    access:
      "Orée d'Anjou englobe plusieurs communes dont La Varenne, siège de Pizza Deli'Zza. Selon votre bourg, comptez 5 à 15 minutes pour rejoindre la pizzeria.",
    landmarks:
      "Orée d'Anjou est une commune nouvelle des bords de Loire. La Varenne, avec son Jardin Public et son accès facile, est le cœur commercial de la commune où se trouve notre pizzeria.",
    intro:
      "Orée d'Anjou, vous avez de la chance : Pizza Deli'Zza est votre pizzeria artisanale locale. Pâte à longue fermentation, ingrédients frais, fait maison — une adresse que vous ne regretterez pas.",
  },
  {
    slug: "pizzeria-oudon",
    name: "Oudon",
    driveTime: "15 min",
    access:
      "Depuis Oudon, traversez la Loire par le pont et rejoignez La Varenne par la D751. Quinze minutes séparent la Tour d'Oudon de notre pizzeria artisanale.",
    landmarks:
      "Oudon est connue pour sa Tour médiévale, l'un des monuments les mieux conservés du bord de Loire. Pizza Deli'Zza, sur la rive angevine, est facilement accessible depuis le pont.",
    intro:
      "Oudon mérite une bonne pizzeria, et Pizza Deli'Zza est là pour ça. À 15 minutes, venez chercher vos pizzas artisanales : pâte longue fermentation, produits locaux, cuisson au four. Commandez en ligne, gagnez du temps.",
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
 * Returns up to 5 nearby communes (distinct names, sorted by driveTime)
 * excluding the current commune. Used for internal linking chips.
 */
export function nearbyCommunes(slug: string): Commune[] {
  const currentName = communeBySlug(slug)?.name;
  const seenNames = new Set<string>();

  return COMMUNES.filter((c) => c.slug !== slug && c.name !== currentName)
    .sort((a, b) => parseInt(a.driveTime) - parseInt(b.driveTime))
    .filter((c) => {
      if (seenNames.has(c.name)) return false;
      seenNames.add(c.name);
      return true;
    })
    .slice(0, 5);
}
