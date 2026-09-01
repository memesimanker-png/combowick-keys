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

// Index is the landing page — keep it eager so first paint is instant
// (no Suspense flash for the most-visited route).
import Index from "./pages/Index";

// All other routes are code-split into their own chunks.
// Cuts initial JS bundle by ~60% — users only download a page when they navigate to it.
const About = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));

const PremiumKeys = lazy(() => import("./pages/PremiumKeys"));
const Oils = lazy(() => import("./pages/Oils"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Scripts = lazy(() => import("./pages/Scripts"));
const ScriptDetail = lazy(() => import("./pages/ScriptDetail"));
const ScriptAdmin = lazy(() => import("./pages/ScriptAdmin"));
const Admin = lazy(() => import("./pages/Admin"));
const Executors = lazy(() => import("./pages/Executors"));
const Keys = lazy(() => import("./pages/Keys"));
const Tutorials = lazy(() => import("./pages/Tutorials"));
const Docs = lazy(() => import("./pages/Docs"));
const Guides = lazy(() => import("./pages/Guides"));
const Changelog = lazy(() => import("./pages/Changelog"));
const AntiCheatGuide = lazy(() => import("./pages/AntiCheatGuide"));
const FairUse = lazy(() => import("./pages/FairUse"));
const FAQ = lazy(() => import("./pages/FAQ"));
const VerifyProviderSelect = lazy(() => import("./pages/VerifyProviderSelect"));
const VerifyStep1 = lazy(() => import("./pages/VerifyStep1"));
const VerifyStep2 = lazy(() => import("./pages/VerifyStep2"));
const VerifyStep3 = lazy(() => import("./pages/VerifyStep3"));
const AdReturn = lazy(() => import("./pages/AdReturn"));
const ExtendReturn = lazy(() => import("./pages/ExtendReturn"));
const ExtendKey = lazy(() => import("./pages/ExtendKey"));
const ScriptUnlockReturn = lazy(() => import("./pages/ScriptUnlockReturn"));
const ScriptUnlockStep2 = lazy(() => import("./pages/ScriptUnlockStep2"));
const AccessKey = lazy(() => import("./pages/AccessKey"));
const Blocked = lazy(() => import("./pages/Blocked"));
const Register = lazy(() => import("./pages/Register"));
const ClaimAccess = lazy(() => import("./pages/ClaimAccess"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WallOfFame = lazy(() => import("./pages/WallOfFame"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const GameLanding = lazy(() => import("./pages/GameLanding"));

// Tuned defaults to massively cut Lovable Cloud DB load on a 5K-visits/day site.
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

// Lightweight fallback while a route chunk loads.
// Matches the cosmic/violet brand so it doesn't look like a broken white flash.
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
                  <Route path="/about" element={<About />} />
                  
                  <Route path="/premium-keys" element={<PremiumKeys />} />
                  <Route path="/oils" element={<Oils />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/refund-policy" element={<RefundPolicy />} />
                  <Route path="/scripts" element={<Scripts />} />
                  <Route path="/scripts/:slug" element={<ScriptDetail />} />
                  <Route path="/games/:game" element={<GameLanding />} />
                  <Route path="/admin/scripts" element={<ScriptAdmin />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/executors" element={<Executors />} />
                  <Route path="/keys" element={<Keys />} />
                  <Route path="/tutorials" element={<Tutorials />} />
                  <Route path="/docs" element={<Docs />} />
                  <Route path="/guides" element={<Guides />} />
                  <Route path="/changelog" element={<Changelog />} />
                  <Route path="/anti-cheat-guide" element={<AntiCheatGuide />} />
                  <Route path="/fair-use" element={<FairUse />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/verify/provider-select" element={<VerifyProviderSelect />} />
                  <Route path="/verify/step1" element={<VerifyStep1 />} />
                  <Route path="/verify/step2" element={<VerifyStep2 />} />
                  <Route path="/verify/step3" element={<VerifyStep3 />} />
                  <Route path="/ad-return" element={<AdReturn />} />
                 <Route path="/ad-return/script-step2" element={<ScriptUnlockStep2 />} />
                 <Route path="/ad-return/script" element={<ScriptUnlockReturn />} />
                 <Route path="/ad-return/ext/:step" element={<ExtendReturn />} />
                  <Route path="/ad-return/:step" element={<AdReturn />} />
                  <Route path="/extend-key" element={<ExtendKey />} />
                  <Route path="/access-key" element={<AccessKey />} />
                  <Route path="/blocked" element={<Blocked />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/wall-of-fame" element={<WallOfFame />} />
                  <Route path="/claim-access" element={<ClaimAccess />} />
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
