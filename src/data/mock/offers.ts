import type { Offer } from "@/types";

export const offers: Offer[] = [
  {
    id: "o1",
    title: "Menu Duo -20%",
    content: "2 pizzas au choix + 2 desserts pour seulement 29,90 €. Code : DUO20",
    image: "/images/offer-duo.svg",
    start_at: "2026-03-01",
    end_at: "2026-04-30",
    active: true,
  },
  {
    id: "o2",
    title: "Livraison offerte",
    content: "Livraison gratuite dès 25 € de commande. Code : FREELIV",
    image: "/images/offer-delivery.svg",
    start_at: "2026-02-15",
    end_at: "2026-03-31",
    active: true,
  },
  {
    id: "o3",
    title: "Happy Hour -30%",
    content: "Toutes les pizzas à -30 % entre 14h et 17h. Code : HAPPY30",
    image: "/images/offer-happy.svg",
    start_at: "2026-03-01",
    end_at: "2026-05-15",
    active: true,
  },
  {
    id: "o4",
    title: "Dessert offert",
    content: "Un tiramisu offert pour toute commande de 2 pizzas. Code : SWEET",
    image: "/images/offer-dessert.svg",
    start_at: "2026-02-01",
    end_at: "2026-03-15",
    active: true,
  },
];
