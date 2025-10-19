import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Home,
  Users,
  Package,
  FileText,
  ShoppingCart,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const Navigation = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    const savedLogoUrl = localStorage.getItem('logoUrl');
    setLogoUrl(savedLogoUrl);
    
    const savedCompanyData = localStorage.getItem('companyData');
    if (savedCompanyData) {
      const data = JSON.parse(savedCompanyData);
      setCompanyName(data.name || 'Gestión de Ventas');
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: Home, label: 'Inicio', href: '/' },
    { icon: Users, label: 'Clientes', href: '/clients' },
    { icon: Package, label: 'Productos', href: '/products' },
    { icon: FileText, label: 'Cotizaciones', href: '/quotes' },
    { icon: ShoppingCart, label: 'Ventas', href: '/sales' },
    { icon: ClipboardList, label: 'Pedidos', href: '/orders' },
    { icon: BarChart3, label: 'Análisis', href: '/analytics' },
    { icon: Settings, label: 'Configuración', href: '/settings' },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:fixed lg:left-0 lg:top-0 lg:w-64 lg:h-screen lg:bg-slate-900 lg:text-white lg:flex lg:flex-col lg:border-r lg:border-slate-800">
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">{companyName}</h1>
              <p className="text-xs text-slate-400">Gestión de Ventas</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-6">
          <div className="space-y-2 px-4">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* User Section */}
        <div className="border-t border-slate-800 p-4">
          <div className="mb-4 px-4">
            <p className="text-xs text-slate-400">Conectado como</p>
            <p className="text-sm font-medium text-white truncate">{currentUser?.email}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start gap-2 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white border-b border-slate-800 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded object-cover" />
            )}
            <span className="font-bold text-sm">{companyName}</span>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="bg-slate-800 border-t border-slate-700">
            <div className="space-y-2 p-4">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
              <button
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors w-full"
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Spacing */}
      <div className="lg:hidden h-16"></div>
    </>
  );
};

export default Navigation;
