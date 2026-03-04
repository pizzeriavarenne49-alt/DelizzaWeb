import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://delizza.fr";
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/menu`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/offers`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/download`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
