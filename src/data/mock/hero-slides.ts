import type { HeroSlide } from "@/types";

export const heroSlides: HeroSlide[] = [
  {
    id: "slide1",
    title: "Truffe & Parmesan",
    subtitle: "Spéciale de la semaine",
    image: "/images/hero-truffle.svg",
    badge: "Nouveauté",
    price: 18.9,
    ctaLabel: "Commander",
    active: true,
    order: 1,
  },
  {
    id: "slide2",
    title: "Pepperoni Inferno",
    subtitle: "Le classique revisité",
    image: "/images/hero-pepperoni.svg",
    badge: "Populaire",
    price: 14.5,
    ctaLabel: "Commander",
    active: true,
    order: 2,
  },
  {
    id: "slide3",
    title: "Menu Duo -20%",
    subtitle: "2 pizzas + 2 desserts",
    image: "/images/hero-duo.svg",
    badge: "Offre",
    price: 29.9,
    ctaLabel: "En profiter",
    active: true,
    order: 3,
  },
];
