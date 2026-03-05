/**
 * Google Analytics 4 script loader.
 *
 * Renders the gtag.js snippet. The measurement ID is read from
 * the NEXT_PUBLIC_GA4_ID environment variable. When missing the
 * component renders nothing, so there is zero cost in dev / preview.
 */

import Script from "next/script";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

export default function GoogleAnalytics() {
  if (!GA4_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA4_ID}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}
