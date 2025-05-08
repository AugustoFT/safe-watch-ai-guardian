
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Cameras from "./pages/Cameras";
import CameraAdd from "./pages/CameraAdd";
import Recordings from "./pages/Recordings";
import RecordingView from "./pages/RecordingView";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { AppShell } from "./components/layout/app-shell";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes inside AppShell */}
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/cameras" element={<Cameras />} />
            <Route path="/cameras/add" element={<CameraAdd />} />
            <Route path="/cameras/:id/details" element={<div>Camera Details</div>} />
            <Route path="/cameras/:id/view" element={<div>Camera Live View</div>} />
            <Route path="/recordings" element={<Recordings />} />
            <Route path="/recordings/:id" element={<RecordingView />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
