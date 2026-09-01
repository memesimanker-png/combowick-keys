import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TranslationProvider } from "@/lib/translation-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StickyMobileCTA } from "@/components/StickyMobileCTA";
import { BackToTop } from "@/components/BackToTop";
import { BackButton } from "@/components/BackButton";
import { RouteProgress } from "@/components/RouteProgress";
import { ExternalLinkMonetag } from "@/components/ExternalLinkMonetag";
import { EngagementTracker } from "@/components/EngagementTracker";

// Landing page (eager).
import Index from "./pages/Index";

// Store + key system.
const PremiumKeys = lazy(() => import("./pages/PremiumKeys"));
const Keys = lazy(() => import("./pages/Keys"));
const AccessKey = lazy(() => import("./pages/AccessKey"));
const ExtendKey = lazy(() => import("./pages/ExtendKey"));
const ClaimAccess = lazy(() => import("./pages/ClaimAccess"));
const Blocked = lazy(() => import("./pages/Blocked"));
const VerifyProviderSelect = lazy(() => import("./pages/VerifyProviderSelect"));
const VerifyStep1 = lazy(() => import("./pages/VerifyStep1"));
const VerifyStep2 = lazy(() => import("./pages/VerifyStep2"));
const VerifyStep3 = lazy(() => import("./pages/VerifyStep3"));
const AdReturn = lazy(() => import("./pages/AdReturn"));
const ExtendReturn = lazy(() => import("./pages/ExtendReturn"));
const ScriptUnlockReturn = lazy(() => import("./pages/ScriptUnlockReturn"));
const ScriptUnlockStep2 = lazy(() => import("./pages/ScriptUnlockStep2"));

// Auth + user.
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

// Admin.
const Admin = lazy(() => import("./pages/Admin"));
const ScriptAdmin = lazy(() => import("./pages/ScriptAdmin"));

// Legal + misc.
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TranslationProvider>
        <TooltipProvider>
          <MotionConfig reducedMotion="user">
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <RouteProgress />
              <EngagementTracker />
              <ExternalLinkMonetag />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />

                  {/* Store + key system */}
                  <Route path="/premium-keys" element={<PremiumKeys />} />
                  <Route path="/keys" element={<Keys />} />
                  <Route path="/access-key" element={<AccessKey />} />
                  <Route path="/extend-key" element={<ExtendKey />} />
                  <Route path="/claim-access" element={<ClaimAccess />} />
                  <Route path="/blocked" element={<Blocked />} />
                  <Route path="/verify/provider-select" element={<VerifyProviderSelect />} />
                  <Route path="/verify/step1" element={<VerifyStep1 />} />
                  <Route path="/verify/step2" element={<VerifyStep2 />} />
                  <Route path="/verify/step3" element={<VerifyStep3 />} />
                  <Route path="/ad-return" element={<AdReturn />} />
                  <Route path="/ad-return/script-step2" element={<ScriptUnlockStep2 />} />
                  <Route path="/ad-return/script" element={<ScriptUnlockReturn />} />
                  <Route path="/ad-return/ext/:step" element={<ExtendReturn />} />
                  <Route path="/ad-return/:step" element={<AdReturn />} />

                  {/* Auth + user */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* Admin */}
                  <Route path="/admin/scripts" element={<ScriptAdmin />} />
                  <Route path="/admin" element={<Admin />} />

                  {/* Legal + misc */}
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/refund-policy" element={<RefundPolicy />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <StickyMobileCTA />
              <BackToTop />
              <BackButton />
            </BrowserRouter>
          </MotionConfig>
        </TooltipProvider>
      </TranslationProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
