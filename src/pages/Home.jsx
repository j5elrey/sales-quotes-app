import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users, Package, FileText, ShoppingCart, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

const Home = () => {
  const { currentUser } = useAuth();
  const { formatCurrency } = useSettings();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    clients: 0,
    products: 0,
    quotes: 0,
    sales: 0,
    totalRevenue: 0,
    pendingQuotes: 0
  });

  useEffect(() => {
    if (!currentUser) return;

    // Suscribirse a cambios en tiempo real
    const unsubscribers = [];

    // Clientes
    const clientsRef = collection(db, 'clients');
    const clientsQuery = query(clientsRef, where('userId', '==', currentUser.uid));
    const clientsUnsub = onSnapshot(clientsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, clients: snapshot.size }));
    });
    unsubscribers.push(clientsUnsub);

    // Productos
    const productsRef = collection(db, 'products');
    const productsQuery = query(productsRef, where('userId', '==', currentUser.uid));
    const productsUnsub = onSnapshot(productsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, products: snapshot.size }));
    });
    unsubscribers.push(productsUnsub);

    // Cotizaciones
    const quotesRef = collection(db, 'quotes');
    const quotesQuery = query(quotesRef, where('userId', '==', currentUser.uid));
    const quotesUnsub = onSnapshot(quotesQuery, (snapshot) => {
      const pendingCount = snapshot.docs.filter(doc => doc.data().status === 'pending').length;
      setStats(prev => ({ ...prev, quotes: snapshot.size, pendingQuotes: pendingCount }));
    });
    unsubscribers.push(quotesUnsub);

    // Ventas
    const salesRef = collection(db, 'sales');
    const salesQuery = query(salesRef, where('userId', '==', currentUser.uid));
    const salesUnsub = onSnapshot(salesQuery, (snapshot) => {
      let totalRevenue = 0;
      snapshot.docs.forEach(doc => {
        totalRevenue += doc.data().total || 0;
      });
      setStats(prev => ({ ...prev, sales: snapshot.size, totalRevenue }));
    });
    unsubscribers.push(salesUnsub);

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bienvenido</h1>
        <p className="text-muted-foreground mt-1">
          Resumen rápido de tu negocio
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{stats.clients}</div>
            <p className="text-xs text-blue-700 mt-1">Clientes registrados</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-900 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{stats.products}</div>
            <p className="text-xs text-purple-700 mt-1">Productos disponibles</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-900 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Cotizaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">{stats.quotes}</div>
            <p className="text-xs text-orange-700 mt-1">
              {stats.pendingQuotes} pendientes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{stats.sales}</div>
            <p className="text-xs text-green-700 mt-1">Ventas registradas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-indigo-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Ingresos Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-900">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-indigo-700 mt-1">De todas las ventas</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button
              onClick={() => navigate('/clients')}
              variant="outline"
              className="justify-start gap-2 h-auto py-4"
            >
              <Users className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Clientes</div>
                <div className="text-xs text-muted-foreground">Ver o agregar</div>
              </div>
            </Button>

            <Button
              onClick={() => navigate('/products')}
              variant="outline"
              className="justify-start gap-2 h-auto py-4"
            >
              <Package className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Productos</div>
                <div className="text-xs text-muted-foreground">Gestionar catálogo</div>
              </div>
            </Button>

            <Button
              onClick={() => navigate('/quotes/new')}
              variant="outline"
              className="justify-start gap-2 h-auto py-4"
            >
              <FileText className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Nueva Cotización</div>
                <div className="text-xs text-muted-foreground">Crear cotización</div>
              </div>
            </Button>

            <Button
              onClick={() => navigate('/sales/new')}
              variant="outline"
              className="justify-start gap-2 h-auto py-4"
            >
              <ShoppingCart className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Nueva Venta</div>
                <div className="text-xs text-muted-foreground">Registrar venta</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-base">Consejos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>✓ Mantén actualizado tu catálogo de productos</p>
            <p>✓ Registra todas tus ventas para mejor análisis</p>
            <p>✓ Usa las cotizaciones para seguimiento de clientes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-base">Próximas Mejoras</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>📊 Reportes avanzados</p>
            <p>📧 Automatización de emails</p>
            <p>📱 Aplicación móvil</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
