import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { ActivateAccount } from './pages/auth/ActivateAccount';
import { Welcome } from './pages/auth/Welcome';
import { PrivacyPolicy } from './pages/legal/PrivacyPolicy';
import { NotificationSettings } from './pages/profile/NotificationSettings';
import { MyDocuments } from './pages/profile/MyDocuments';
import { AdminNotificationSettings } from './pages/admin/NotificationSettings';
import { Dashboard } from './pages/Dashboard';
import { AgendaList } from './pages/agenda/AgendaList';
import { AppointmentDetail } from './pages/agenda/AppointmentDetail';
import { SalesReportForm } from './pages/sales/SalesReportForm';
import { SalesReportView } from './pages/sales/SalesReportView';
import { SyncMonitoring } from './pages/admin/SyncMonitoring';
import { SFTPConfiguration } from './pages/admin/SFTPConfiguration';
import { SFTPOperations } from './pages/admin/SFTPOperations';
import { UserManagement } from './pages/admin/UserManagement';
import { CreateUser } from './pages/admin/CreateUser';
import { ConnectionLogs } from './pages/admin/ConnectionLogs';
import FileHistory from './pages/admin/FileHistory';
import { CategoriesManagement } from './pages/admin/CategoriesManagement';
import { ProductsManagement } from './pages/admin/ProductsManagement';
import { BulkMarkReported } from './pages/admin/BulkMarkReported';
import { ClientsList } from './pages/clients/ClientsList';
import { CustomerDetail } from './pages/clients/CustomerDetail';
import { CustomerForm } from './pages/clients/CustomerForm';
import { FreelanceRegister } from './pages/freelance/FreelanceRegister';
import { FreelanceRevision } from './pages/freelance/FreelanceRevision';
import { FreelanceRegistrations } from './pages/hr/FreelanceRegistrations';
import { FreelanceRegistrationDetail } from './pages/hr/FreelanceRegistrationDetail';
import { PeriodicDocuments } from './pages/hr/PeriodicDocuments';
import { CookieBanner } from './components/ui/CookieBanner';
import { useAuth } from './contexts/AuthContext';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      {!user && <CookieBanner />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/activate" element={<ActivateAccount />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/freelance/register" element={<FreelanceRegister />} />
        <Route path="/freelance/revision/:token" element={<FreelanceRevision />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><AgendaList /></ProtectedRoute>} />
        <Route path="/agenda/:id" element={<ProtectedRoute><AppointmentDetail /></ProtectedRoute>} />
        <Route path="/sales/create/:appointmentId" element={<ProtectedRoute><SalesReportForm /></ProtectedRoute>} />
        <Route path="/sales/edit/:appointmentId" element={<ProtectedRoute><SalesReportForm /></ProtectedRoute>} />
        <Route path="/sales/:id" element={<ProtectedRoute><SalesReportView /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><ClientsList /></ProtectedRoute>} />
        <Route path="/clients/new" element={<ProtectedRoute><CustomerForm /></ProtectedRoute>} />
        <Route path="/clients/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
        <Route path="/admin/sftp" element={<ProtectedRoute><SFTPConfiguration /></ProtectedRoute>} />
        <Route path="/admin/sftp-operations" element={<ProtectedRoute><SFTPOperations /></ProtectedRoute>} />
        <Route path="/admin/sync" element={<ProtectedRoute><SyncMonitoring /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
        <Route path="/admin/users/new" element={<ProtectedRoute><CreateUser /></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute><ConnectionLogs /></ProtectedRoute>} />
        <Route path="/admin/file-history" element={<ProtectedRoute><FileHistory /></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute><AdminNotificationSettings /></ProtectedRoute>} />
        <Route path="/admin/categories" element={<ProtectedRoute><CategoriesManagement /></ProtectedRoute>} />
        <Route path="/admin/products" element={<ProtectedRoute><ProductsManagement /></ProtectedRoute>} />
        <Route path="/admin/bulk-mark-reported" element={<ProtectedRoute><BulkMarkReported /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><MyDocuments /></ProtectedRoute>} />
        <Route path="/hr/registrations" element={<ProtectedRoute><FreelanceRegistrations /></ProtectedRoute>} />
        <Route path="/hr/registrations/:id" element={<ProtectedRoute><FreelanceRegistrationDetail /></ProtectedRoute>} />
        <Route path="/hr/periodic-documents" element={<ProtectedRoute><PeriodicDocuments /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
