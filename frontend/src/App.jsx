import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/dashboard/Dashboard';
import Analytics from './pages/dashboard/Analytics';
import RouteList from './pages/routes/RouteList';
import CreateRoute from './pages/routes/CreateRoute';
import RouteDetails from './pages/routes/RouteDetails';
import ScheduleCalendar from './pages/schedules/ScheduleCalendar';
import TimetableManagement from './pages/schedules/TimetableManagement';
import BusList from './pages/buses/BusList';
import BusDetails from './pages/buses/BusDetails';
import DriverList from './pages/drivers/DriverList';
import DriverProfile from './pages/drivers/DriverProfile';
import DriverSelfService from './pages/drivers/DriverSelfService';
import MaintenanceDashboard from './pages/maintenance/MaintenanceDashboard';
import FuelLogs from './pages/maintenance/FuelLogs';
import AnalyticsReports from './pages/reports/AnalyticsReports';
import ExportReports from './pages/reports/ExportReports';
import UserManagement from './pages/settings/UserManagement';
import SystemSettings from './pages/settings/SystemSettings';
import NotificationsPage from './pages/notifications/NotificationsPage';
import Loading from './components/ui/Loading';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loading fullScreen />;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loading fullScreen />;
  return !user ? children : <Navigate to="/" replace />;
};

const RoleRoute = ({ children, allow = [] }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loading fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return allow.includes(user.role) ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />

          {/* Protected */}
          <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="routes" element={<RouteList />} />
            <Route path="routes/create" element={<CreateRoute />} />
            <Route path="routes/:id" element={<RouteDetails />} />
            <Route path="schedules" element={<ScheduleCalendar />} />
            <Route path="schedules/timetable" element={<TimetableManagement />} />
            <Route path="buses" element={<BusList />} />
            <Route path="buses/:id" element={<BusDetails />} />
            <Route path="drivers" element={<DriverList />} />
            <Route path="drivers/:id" element={<DriverProfile />} />
            <Route
              path="driver/me"
              element={
                <RoleRoute allow={['driver']}>
                  <DriverSelfService />
                </RoleRoute>
              }
            />
            <Route path="maintenance" element={<MaintenanceDashboard />} />
            <Route path="maintenance/fuel" element={<FuelLogs />} />
            <Route path="reports" element={<AnalyticsReports />} />
            <Route path="reports/export" element={<ExportReports />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route
              path="settings/users"
              element={
                <RoleRoute allow={['super_admin', 'depot_manager']}>
                  <UserManagement />
                </RoleRoute>
              }
            />
            <Route
              path="settings"
              element={
                <RoleRoute allow={['super_admin', 'depot_manager']}>
                  <SystemSettings />
                </RoleRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
