import type { MetadataRoute } from "next";
import { COMING_SOON } from "@/lib/comingSoon";

export function buildRobots(comingSoon: boolean = COMING_SOON): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: comingSoon ? ["/"] : ["/go", "/api/"],
      },
    ],
    sitemap: comingSoon ? undefined : "https://www.delizza.fr/sitemap.xml",
  };
}

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
