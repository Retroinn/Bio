import { useEffect } from 'react';
import { RouterProvider, useRouter } from '@/components/Router';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/ForgotPasswordPage';
import { OverviewPage } from '@/pages/dashboard/OverviewPage';
import { ProfileEditorPage } from '@/pages/dashboard/ProfileEditorPage';
import { LinksPage } from '@/pages/dashboard/LinksPage';
import { SocialsPage } from '@/pages/dashboard/SocialsPage';
import { ProjectsPage } from '@/pages/dashboard/ProjectsPage';
import { WidgetsPage } from '@/pages/dashboard/WidgetsPage';
import { DiscordPage } from '@/pages/dashboard/DiscordPage';
import { AppearancePage } from '@/pages/dashboard/AppearancePage';
import { MediaPage } from '@/pages/dashboard/MediaPage';
import { MusicPage } from '@/pages/dashboard/MusicPage';
import { AnalyticsPage } from '@/pages/dashboard/AnalyticsPage';
import { SeoPage } from '@/pages/dashboard/SeoPage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';
import { BillingPage } from '@/pages/dashboard/BillingPage';
import { CustomDomainsPage } from '@/pages/dashboard/CustomDomainsPage';
import { SupportPage } from '@/pages/dashboard/SupportPage';
import { PublicProfilePage } from '@/pages/PublicProfilePage';
import { PricingPage } from '@/pages/PricingPage';
import { Spinner } from '@/components/ui';
import {
  AdminAnalyticsPage,
  AdminMediaPage,
  AdminOverviewPage,
  AdminReportsPage,
  AdminSettingsPage,
  AdminSubscriptionsPage,
  AdminSupportPage,
  AdminUsersPage,
} from '@/pages/admin/AdminPages';

function Routes() {
  const { path, navigate } = useRouter();
  const { loading, session, profile } = useAuth();

  useEffect(() => {
    if (loading) return;
    if ((path.startsWith('/dashboard') || path.startsWith('/admin')) && !session) {
      navigate('/login', { replace: true });
    }
  }, [path, session, loading, navigate]);

  if (loading && (path.startsWith('/dashboard') || path.startsWith('/admin'))) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-accent" />
      </div>
    );
  }

  // Public routes
  if (path === '/') return <LandingPage />;
  if (path === '/pricing') return <PricingPage />;
  if (path === '/login') return <LoginPage />;
  if (path === '/register') return <RegisterPage />;
  if (path === '/forgot-password') return <ForgotPasswordPage />;
  if (path === '/reset-password') return <ResetPasswordPage />;

  // Dashboard routes (protected)
  if (path === '/dashboard') return <OverviewPage />;
  if (path === '/dashboard/profile') return <ProfileEditorPage />;
  if (path === '/dashboard/links') return <LinksPage />;
  if (path === '/dashboard/socials') return <SocialsPage />;
  if (path === '/dashboard/projects') return <ProjectsPage />;
  if (path === '/dashboard/widgets') return <WidgetsPage />;
  if (path === '/dashboard/discord') return <DiscordPage />;
  if (path === '/dashboard/appearance') return <AppearancePage />;
  if (path === '/dashboard/media') return <MediaPage />;
  if (path === '/dashboard/music') return <MusicPage />;
  if (path === '/dashboard/analytics') return <AnalyticsPage />;
  if (path === '/dashboard/seo') return <SeoPage />;
  if (path === '/dashboard/billing') return <BillingPage />;
  if (path === '/dashboard/domains') return <CustomDomainsPage />;
  if (path === '/dashboard/support') return <SupportPage />;
  if (path === '/dashboard/settings') return <SettingsPage />;

  // Admin routes are protected again inside AdminLayout through is_admin().
  if (path === '/admin') return <AdminOverviewPage />;
  if (path === '/admin/users') return <AdminUsersPage />;
  if (path === '/admin/subscriptions') return <AdminSubscriptionsPage />;
  if (path === '/admin/support') return <AdminSupportPage />;
  if (path === '/admin/reports') return <AdminReportsPage />;
  if (path === '/admin/media') return <AdminMediaPage />;
  if (path === '/admin/analytics') return <AdminAnalyticsPage />;
  if (path === '/admin/settings') return <AdminSettingsPage />;

  // Public profile (/:username) — single-segment paths only
  if (path.startsWith('/') && !path.slice(1).includes('/')) {
    return <PublicProfilePage username={path.slice(1)} />;
  }

  // Fallback 404
  return <PublicProfilePage username="__notfound__" />;
}

function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes />
        </ToastProvider>
      </AuthProvider>
    </RouterProvider>
  );
}

export default App;
