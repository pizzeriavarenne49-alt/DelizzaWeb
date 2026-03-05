/**
 * JSON-LD schema generators for Pizza Deli'Zza.
 *
 * Each function returns a plain object ready to be serialised by <JsonLd />.
 * All data comes from the centralised BUSINESS constant in lib/seo.ts.
 */

import { BUSINESS, SITE_URL, type Commune } from "@/lib/seo";

/* ------------------------------------------------------------------ */
/*  Restaurant / LocalBusiness                                         */
/* ------------------------------------------------------------------ */

export function restaurantSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Restaurant", "LocalBusiness"],
    "@id": `${SITE_URL}/#restaurant`,
    name: BUSINESS.name,
    url: BUSINESS.url,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    description: BUSINESS.description,
    image: `${SITE_URL}/images/og-default.png`,
    logo: `${SITE_URL}/images/og-default.png`,
    priceRange: BUSINESS.priceRange,
    servesCuisine: BUSINESS.servesCuisine,
    acceptsReservations: false,
    currenciesAccepted: "EUR",
    paymentAccepted: "Cash, Credit Card",
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.streetAddress,
      postalCode: BUSINESS.address.postalCode,
      addressLocality: BUSINESS.address.addressLocality,
      addressRegion: BUSINESS.address.addressRegion,
      addressCountry: BUSINESS.address.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    openingHoursSpecification: BUSINESS.openingHours.map((spec) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: spec.dayOfWeek,
      opens: spec.opens,
      closes: spec.closes,
    })),
    sameAs: [BUSINESS.social.facebook, BUSINESS.social.instagram].filter(
      (u) => !u.startsWith("TODO"),
    ),
    hasMenu: `${SITE_URL}/menu`,
    potentialAction: {
      "@type": "OrderAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/menu`,
        actionPlatform: "http://schema.org/DesktopWebPlatform",
      },
      deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModePickUp",
    },
    areaServed: [
      { "@type": "City", name: "La Varenne" },
      { "@type": "City", name: "Orée d'Anjou" },
      { "@type": "City", name: "Saint-Florent-le-Vieil" },
      { "@type": "City", name: "Champtoceaux" },
      { "@type": "City", name: "Landemont" },
      { "@type": "City", name: "Liré" },
      { "@type": "City", name: "Drain" },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  WebSite + SearchAction                                             */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  BreadcrumbList                                                     */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  FAQPage (for local pages)                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Local-page FAQ generator                                           */
/* ------------------------------------------------------------------ */

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
      answer: `Nous sommes ouverts du mardi au dimanche, de 11h à 13h30 et de 18h à 22h. Fermé le lundi.`,
    },
    {
      question: `Peut-on commander en ligne depuis ${commune.name} ?`,
      answer: `Oui ! Rendez-vous sur delizza.fr pour commander en click & collect. Vous choisissez vos pizzas, vous payez en ligne et vous récupérez votre commande à La Varenne, prête à l'heure convenue.`,
    },
    {
      question: `Pizza Deli'Zza livre-t-elle à ${commune.name} ?`,
      answer: `Non, nous ne proposons pas de livraison. Nous sommes une pizzeria à emporter uniquement. Le retrait se fait directement à notre pizzeria de La Varenne.`,
    },
    {
      question: `Quelles pizzas propose Pizza Deli'Zza ?`,
      answer: `Notre carte propose des pizzas artisanales avec une pâte à longue fermentation (48h minimum), des ingrédients frais et locaux. Consultez notre menu complet sur delizza.fr/menu.`,
    },
  ];
}
