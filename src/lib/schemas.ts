/**
 * JSON-LD schema generators for Pizza Deli'Zza.
 */

import { BUSINESS, SITE_URL, type Commune } from "@/lib/seo";

const SEO_DESCRIPTION =
  "Pizza Deli'Zza à Orée d'Anjou : pizzas artisanales à emporter, commande par téléphone au 02 21 68 81 82. Découvrez la carte, les horaires et les informations pratiques.";

export function restaurantSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Restaurant", "LocalBusiness"],
    "@id": `${SITE_URL}/#restaurant`,
    name: BUSINESS.name,
    url: BUSINESS.url,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    description: SEO_DESCRIPTION,
    image: `${SITE_URL}/images/og-default.png`,
    logo: `${SITE_URL}/images/og-default.png`,
    priceRange: BUSINESS.priceRange,
    servesCuisine: BUSINESS.servesCuisine,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.streetAddress,
      postalCode: BUSINESS.address.postalCode,
      addressLocality: BUSINESS.address.addressLocality,
      addressRegion: BUSINESS.address.addressRegion,
      addressCountry: BUSINESS.address.addressCountry,
    },
    openingHoursSpecification: BUSINESS.openingHours.map((spec) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: spec.dayOfWeek,
      opens: spec.opens,
      closes: spec.closes,
    })),
    hasMenu: `${SITE_URL}/menu`,
    areaServed: [
      { "@type": "City", name: "La Varenne" },
      { "@type": "City", name: "Orée d'Anjou" },
      { "@type": "City", name: "Saint-Florent-le-Vieil" },
      { "@type": "City", name: "Champtoceaux" },
      { "@type": "City", name: "Drain" },
      { "@type": "City", name: "Ancenis-Saint-Géréon" },
    ],
  };
}

export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: BUSINESS.name,
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#restaurant` },
  };
}

export interface BreadcrumbItem {
  name: string;
  href: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href.startsWith("http") ? item.href : `${SITE_URL}${item.href}`,
    })),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function communeFaqs(commune: Commune): FaqItem[] {
  const isLaVarenne = commune.driveTime === "0 min";
  return [
    {
      question: `Où se trouve la pizzeria Pizza Deli'Zza près de ${commune.name} ?`,
      answer: `Pizza Deli'Zza est située au ${BUSINESS.address.streetAddress}, ${BUSINESS.address.postalCode} ${BUSINESS.address.addressLocality} (La Varenne).${
        isLaVarenne ? "" : ` Depuis ${commune.name}, comptez environ ${commune.driveTime} en voiture.`
      }`,
    },
    {
      question: `Quels sont les horaires de la pizzeria à La Varenne ?`,
      answer: `Nous sommes ouverts du mardi au dimanche, de 11h à 13h30 et de 18h30 à 22h. Fermé le lundi.`,
    },
    {
      question: `Peut-on commander depuis ${commune.name} ?`,
      answer: `Oui. Consultez la carte sur delizza.fr/menu puis récupérez votre commande à La Varenne, au créneau prévu.`,
    },
    {
      question: `Pizza Deli'Zza livre-t-elle à ${commune.name} ?`,
      answer: `Non, nous ne proposons pas de livraison. Le retrait se fait directement à notre pizzeria de La Varenne.`,
    },
    {
      question: `Quelles pizzas propose Pizza Deli'Zza ?`,
      answer: `Pizza Deli'Zza propose des pizzas artisanales à emporter. La carte, les horaires et les informations pratiques sont disponibles sur delizza.fr/menu.`,
    },
  ];
}

export function menuSectionSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${SITE_URL}/menu#menu`,
    name: "Menu Pizza Deli'Zza",
    description: "Carte des pizzas artisanales à emporter de Pizza Deli'Zza à Orée d'Anjou.",
    url: `${SITE_URL}/menu`,
    inLanguage: "fr",
  };
}
