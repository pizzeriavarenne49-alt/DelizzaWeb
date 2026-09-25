/**
 * JSON-LD schema generators for Pizza Deli'Zza.
 */

import { BUSINESS, SITE_URL, type Commune } from "@/lib/seo";

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
  return [
    {
      question: `Où retirer une commande Pizza Deli'Zza passée depuis ${commune.name} ?`,
      answer: `Pizza Deli'Zza est située au ${BUSINESS.address.streetAddress}, ${BUSINESS.address.postalCode} ${BUSINESS.address.addressLocality} (La Varenne).`,
    },
    {
      question: `Quels sont les horaires de la pizzeria à La Varenne ?`,
      answer: `Nous sommes ouverts uniquement le soir du mercredi au dimanche. Lundi et mardi : fermés. Mercredi et jeudi : 18h30 à 21h30. Vendredi, samedi et dimanche : 18h30 à 22h00.`,
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
      answer: `Pizza Deli'Zza propose des pizzas à emporter. Consultez les recettes de la carte sur delizza.fr/menu.`,
    },
  ];
}

export function menuSectionSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${SITE_URL}/menu#menu`,
    name: "Menu Pizza Deli'Zza",
    description: "Carte des pizzas à emporter de Pizza Deli'Zza à Orée d'Anjou.",
    url: `${SITE_URL}/menu`,
    inLanguage: "fr",
  };
}
