import { WL_APP_ID } from "@/config/firebase";
import BottomNav from "@/components/ui/BottomNav";
import DesktopNav from "@/components/ui/DesktopNav";
import AppBanner from "@/components/ui/AppBanner";
import { Providers } from "@/components/ui/SiteProviders";
import SeoFooterGate from "@/components/seo/SeoFooterGate";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers websiteAppId={WL_APP_ID} websiteProjectId={process.env.FIREBASE_PROJECT_ID ?? ""}>
      <AppBanner />
      <div className="mx-auto max-w-md md:max-w-6xl md:flex">
        <DesktopNav />
        <main className="flex-1 min-w-0 min-h-screen pb-20 md:pb-8">
          {children}
          <SeoFooterGate />
        </main>
      </div>
      <BottomNav />
    </Providers>
  );
}
