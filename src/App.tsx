
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EventCreation from "./pages/EventCreation";
import VolunteerSignup from "./pages/VolunteerSignup";
import EventRoster from "./pages/EventRoster";
import Contacts from "./pages/Contacts";
import Settings from "./pages/Settings";
import Database from "./pages/Database";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events/new" element={<EventCreation />} />
          <Route path="/events/:eventId/edit" element={<EventCreation />} />
          <Route path="/events/:eventId" element={<VolunteerSignup />} />
          <Route path="/events/:eventId/roster" element={<EventRoster />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/database" element={<Database />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
