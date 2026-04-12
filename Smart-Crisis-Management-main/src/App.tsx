import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import RoleSelection from "./pages/RoleSelection";
import LoginAdmin from "./pages/LoginAdmin";
import LoginVolunteer from "./pages/LoginVolunteer";
import LoginCitizen from "./pages/LoginCitizen";
import RegisterVolunteer from "./pages/RegisterVolunteer";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAlerts from "./pages/AdminAlerts";
import AdminVolunteers from "./pages/AdminVolunteers";
import AdminLoginLogs from "./pages/AdminLoginLogs";
import AdminResources from "./pages/AdminResources";
import AdminSettings from "./pages/AdminSettings";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import VolunteerTasks from "./pages/VolunteerTasks";
import VolunteerAlerts from "./pages/VolunteerAlerts";
import CitizenDashboard from "./pages/CitizenDashboard";
import CitizenAlerts from "./pages/CitizenAlerts";
import CitizenReports from "./pages/CitizenReports";
import CitizenShelters from "./pages/CitizenShelters";
import ReportIncident from "./pages/ReportIncident";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode; allowedRole: string }) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (role !== allowedRole) {
    return <Navigate to={`/${role}`} replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isAuthenticated && role) {
    return <Navigate to={`/${role}`} replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<PublicRoute><RoleSelection /></PublicRoute>} />
    <Route path="/login/admin" element={<PublicRoute><LoginAdmin /></PublicRoute>} />
    <Route path="/login/volunteer" element={<PublicRoute><LoginVolunteer /></PublicRoute>} />
    <Route path="/login/citizen" element={<PublicRoute><LoginCitizen /></PublicRoute>} />
    <Route path="/register/volunteer" element={<PublicRoute><RegisterVolunteer /></PublicRoute>} />
    
    <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
    <Route path="/admin/alerts" element={<ProtectedRoute allowedRole="admin"><AdminAlerts /></ProtectedRoute>} />
    <Route path="/admin/volunteers" element={<ProtectedRoute allowedRole="admin"><AdminVolunteers /></ProtectedRoute>} />
    <Route path="/admin/logs" element={<ProtectedRoute allowedRole="admin"><AdminLoginLogs /></ProtectedRoute>} />
    <Route path="/admin/resources" element={<ProtectedRoute allowedRole="admin"><AdminResources /></ProtectedRoute>} />
    <Route path="/admin/settings" element={<ProtectedRoute allowedRole="admin"><AdminSettings /></ProtectedRoute>} />
    
    <Route path="/volunteer" element={<ProtectedRoute allowedRole="volunteer"><VolunteerDashboard /></ProtectedRoute>} />
    <Route path="/volunteer/tasks" element={<ProtectedRoute allowedRole="volunteer"><VolunteerTasks /></ProtectedRoute>} />
    <Route path="/volunteer/alerts" element={<ProtectedRoute allowedRole="volunteer"><VolunteerAlerts /></ProtectedRoute>} />
    
    <Route path="/citizen" element={<ProtectedRoute allowedRole="citizen"><CitizenDashboard /></ProtectedRoute>} />
    <Route path="/citizen/report" element={<ProtectedRoute allowedRole="citizen"><ReportIncident /></ProtectedRoute>} />
    <Route path="/citizen/reports" element={<ProtectedRoute allowedRole="citizen"><CitizenReports /></ProtectedRoute>} />
    <Route path="/citizen/alerts" element={<ProtectedRoute allowedRole="citizen"><CitizenAlerts /></ProtectedRoute>} />
    <Route path="/citizen/shelters" element={<ProtectedRoute allowedRole="citizen"><CitizenShelters /></ProtectedRoute>} />
    
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
