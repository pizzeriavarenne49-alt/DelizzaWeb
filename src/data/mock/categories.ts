import type { Category } from "@/types";

export const categories: Category[] = [
  { id: "popular", name: "Populaire", slug: "populaire", order: 0, active: true, icon: "🔥" },
  { id: "pizzas", name: "Pizzas", slug: "pizzas", order: 1, active: true, icon: "🍕" },
  { id: "entrees", name: "Entrées", slug: "entrees", order: 2, active: true, icon: "🥗" },
  { id: "desserts", name: "Desserts", slug: "desserts", order: 3, active: true, icon: "🍰" },
  { id: "promos", name: "Promos", slug: "promos", order: 4, active: true, icon: "🎁" },
];
