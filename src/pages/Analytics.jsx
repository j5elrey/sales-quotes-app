import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Download } from 'lucide-react';

const Analytics = () => {
  const { currentUser } = useAuth();
  const { formatCurrency } = useSettings();
  const [sales, setSales] = useState([]);
  const [timeRange, setTimeRange] = useState('month');
  const [filteredSales, setFilteredSales] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [averageSale, setAverageSale] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    loadSales();
  }, [currentUser]);

  useEffect(() => {
    filterSalesByTimeRange();
  }, [sales, timeRange]);

  const loadSales = async () => {
    if (!currentUser) return;
    
    try {
      const querySnapshot = await getDocs(collection(db, 'sales'));
      const salesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSales(salesData);
    } catch (error) {
      console.error('Error al cargar ventas:', error);
    }
  };

  const filterSalesByTimeRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (timeRange) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'semester':
        startDate = now.getMonth() < 6 
          ? new Date(now.getFullYear(), 0, 1)
          : new Date(now.getFullYear(), 6, 1);
        endDate = now.getMonth() < 6
          ? new Date(now.getFullYear(), 5, 30)
          : new Date(now.getFullYear(), 11, 31);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    const filtered = sales.filter(sale => {
      const saleDate = sale.createdAt?.toDate() || new Date();
      return saleDate >= startDate && saleDate <= endDate;
    });

    setFilteredSales(filtered);
    
    const total = filtered.reduce((sum, sale) => sum + (sale.total || 0), 0);
    setTotalSales(total);
    setTotalOrders(filtered.length);
    setAverageSale(filtered.length > 0 ? total / filtered.length : 0);
  };

  const exportToExcel = () => {
    const data = filteredSales.map(sale => ({
      'Número de Pedido': sale.orderNumber,
      'Cliente': sale.clientName,
      'Fecha': sale.createdAt ? format(sale.createdAt.toDate(), 'dd/MM/yyyy') : '',
      'Total': sale.total,
      'Método de Pago': getPaymentMethodLabel(sale.paymentMethod),
      'Estado': getStatusLabel(sale.status)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');
    
    const filename = `ventas_${timeRange}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Efectivo',
      transfer: 'Transferencia',
      credit: 'Fiado'
    };
    return labels[method] || method;
  };

  const getStatusLabel = (status) => {
    const labels = {
      completed: 'Completada',
      pending: 'Pendiente',
      cancelled: 'Cancelada'
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Análisis de Ventas</h1>
        <p className="text-muted-foreground mt-1">
          Visualiza el rendimiento de tus ventas
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={timeRange === 'day' ? 'default' : 'outline'}
          onClick={() => setTimeRange('day')}
        >
          Hoy
        </Button>
        <Button
          variant={timeRange === 'week' ? 'default' : 'outline'}
          onClick={() => setTimeRange('week')}
        >
          Esta Semana
        </Button>
        <Button
          variant={timeRange === 'month' ? 'default' : 'outline'}
          onClick={() => setTimeRange('month')}
        >
          Este Mes
        </Button>
        <Button
          variant={timeRange === 'semester' ? 'default' : 'outline'}
          onClick={() => setTimeRange('semester')}
        >
          Este Semestre
        </Button>
        <Button
          variant={timeRange === 'year' ? 'default' : 'outline'}
          onClick={() => setTimeRange('year')}
        >
          Este Año
        </Button>
        <Button
          variant="outline"
          onClick={exportToExcel}
          disabled={filteredSales.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar a Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredSales.length} transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Venta Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageSale)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Por transacción
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Número de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En este período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{timeRange.toUpperCase()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), 'dd/MM/yyyy')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Pedido #</th>
                  <th className="text-left py-2 px-2">Cliente</th>
                  <th className="text-left py-2 px-2">Fecha</th>
                  <th className="text-right py-2 px-2">Total</th>
                  <th className="text-left py-2 px-2">Pago</th>
                  <th className="text-left py-2 px-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay ventas en este período
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-mono text-xs font-bold">
                        {sale.orderNumber}
                      </td>
                      <td className="py-2 px-2">{sale.clientName}</td>
                      <td className="py-2 px-2">
                        {sale.createdAt && format(sale.createdAt.toDate(), 'dd/MM/yyyy')}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="py-2 px-2">
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                          sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {getStatusLabel(sale.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;

