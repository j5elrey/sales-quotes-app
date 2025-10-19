import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Home from './pages/Home';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Quotes from './pages/Quotes';
import QuoteForm from './pages/QuoteForm';
import Sales from './pages/Sales';
import SalesForm from './pages/SalesForm';
import Orders from './pages/Orders';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import './App.css';

// Protected Route component
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// Layout component for authenticated pages
function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:ml-64 p-6">
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  const { currentUser } = useAuth();
  
  return (
    <Routes>
      <Route 
        path="/login" 
        element={currentUser ? <Navigate to="/" replace /> : <Login />} 
      />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Home />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Clients />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Products />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/quotes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Quotes />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/quotes/new"
        element={
          <ProtectedRoute>
            <AppLayout>
              <QuoteForm />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/quotes/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <QuoteForm />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Sales />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/sales/new"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SalesForm />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/sales/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SalesForm />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Orders />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Analytics />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <SettingsProvider>
          <AppRoutes />
        </SettingsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

