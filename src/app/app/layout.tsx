import { requireAuth } from "@/lib/auth-guard";
import { AppHeader } from "@/components/app/AppHeader";
import { AppBottomNav } from "@/components/app/AppBottomNav";
import { UserProvider } from "@/context/UserContext";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <UserProvider user={user}>
      <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors">
        {/* Top Desktop Navigation */}
        <AppHeader user={user} />

        {/* Main Content Area with Suspense boundary */}
        <main className="flex-1 pb-20 lg:pb-10 print:p-0 print:m-0 print:pb-0">
          <Suspense fallback={null}>{children}</Suspense>
        </main>

        {/* Mobile Bottom Bar */}
        <AppBottomNav userRole={user.role} />
      </div>
    </UserProvider>
  );
}
