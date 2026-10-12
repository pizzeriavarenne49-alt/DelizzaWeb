export const MARKETING_SCHEMA_VERSION = 1 as const;

export type MarketingEventType =
  | "page_view"
  | "session_start"
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_start"
  | "checkout_error"
  | "campaign_visit";

export interface MarketingConsent {
  analytics: boolean;
  marketing: boolean;
  revision: string;
  updatedAt: string;
}

export interface MarketingEvent {
  id: string;
  type: MarketingEventType;
  occurredAt: string;
  path?: string;
  productId?: string;
  quantity?: number;
  errorCode?: string;
}

export interface MarketingAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrerDomain?: string;
  landingPath?: string;
  campaignLinkId?: string;
}

export interface MarketingOrderContext {
  sessionId: string;
  sourceId: string;
  attributionToken?: string;
}
