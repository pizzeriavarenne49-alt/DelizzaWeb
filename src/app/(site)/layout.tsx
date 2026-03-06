import BottomNav from "@/components/ui/BottomNav";
import DesktopNav from "@/components/ui/DesktopNav";
import AppBanner from "@/components/ui/AppBanner";
import { Providers } from "@/components/ui/SiteProviders";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <AppBanner />
      <div className="mx-auto max-w-md md:max-w-6xl md:flex">
        <DesktopNav />
        <main className="flex-1 min-w-0 min-h-screen pb-20 md:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </Providers>
  );
}
