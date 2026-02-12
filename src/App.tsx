
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import EventCreation from "./pages/EventCreation";
import Contacts from "./pages/Contacts";
import EventRoster from "./pages/EventRoster";
import VolunteerSignup from "./pages/VolunteerSignup";
import Templates from "./pages/Templates";
import RecentlyDeleted from "./pages/RecentlyDeleted";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="stars-bg" aria-hidden="true" />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events/create" element={<EventCreation />} />
          <Route path="/events/:eventId/edit" element={<EventCreation />} />
          <Route path="/:slug/checkin" element={<EventRoster />} />
          <Route path="/:eventSlug" element={<VolunteerSignup />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/recently-deleted" element={<RecentlyDeleted />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
