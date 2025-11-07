import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Eye, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { generateSalePDF } from '@/lib/pdfUtils';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const Orders = () => {
  const { currentUser } = useAuth();
  const { formatCurrency } = useSettings();
  
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'in-progress', 'completed', 'cancelled'

  useEffect(() => {
    if (!currentUser) return;

    // Suscribirse a cambios en tiempo real
    const unsubscribe = onSnapshot(collection(db, 'sales'), (snapshot) => {
      let ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (filterStatus !== 'all') {
        ordersData = ordersData.filter(order => order.status === filterStatus);
      }
      
      // Ordenar por fecha de entrega (más próxima primero)
      ordersData.sort((a, b) => {
        const dateA = a.deliveryDate && a.deliveryDate.toDate ? a.deliveryDate.toDate() : new Date(8640000000000000);
        const dateB = b.deliveryDate && b.deliveryDate.toDate ? b.deliveryDate.toDate() : new Date(8640000000000000);
        return dateA - dateB;
      });
      
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, [currentUser, filterStatus]);

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este pedido cancelado? Esta acción es irreversible.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'sales', orderId));
      // onSnapshot se encargará de actualizar el estado 'orders' automáticamente
      alert('Pedido eliminado con éxito.');
    } catch (error) {
      console.error('Error al eliminar pedido:', error);
      alert('Error al eliminar el pedido.');
    }
  };

  const isDeliveryDateUrgent = (deliveryDate) => {
    if (!deliveryDate || !deliveryDate.toDate) return false;
    const daysUntilDelivery = differenceInDays(deliveryDate.toDate(), new Date());
    return daysUntilDelivery <= 1 && daysUntilDelivery >= 0;
  };

  const handleStatusChange = async (orderId, newStatusValue) => {
    try {
      await updateDoc(doc(db, 'sales', orderId), {
        status: newStatusValue
      });
      setEditingOrder(null);
    } catch (error) {
      console.error('Error al actualizar estatus:', error);
      alert('Error al actualizar el estatus');
    }
  };

  const handleViewPDF = async (order) => {
    setSelectedOrder(order);
    setPdfDialogOpen(true);

    // Generar el PDF y guardarlo en el estado para la vista previa
    try {
      const logoUrl = localStorage.getItem("logoUrl");
      const companyDataStr = localStorage.getItem("companyData");
      const companyData = companyDataStr ? JSON.parse(companyDataStr) : null;

      const doc = await generateSalePDF(
        order,
        {
          name: order.clientName,
          email: order.clientEmail || "",
          phone: order.clientPhone || "",
        },
        order.items,
        formatCurrency,
        logoUrl,
        companyData
      );
      const pdfData = doc.output("datauristring");
      setSelectedOrder((prev) => ({ ...prev, pdfData }));
    } catch (error) {
      console.error("Error al generar PDF para vista previa:", error);
      alert("Error al generar el PDF para vista previa");
    }
  };

  const handleDownloadPDF = async (order) => {
    try {
      const logoUrl = localStorage.getItem('logoUrl');
      const companyDataStr = localStorage.getItem('companyData');
      const companyData = companyDataStr ? JSON.parse(companyDataStr) : null;

      const doc = await generateSalePDF(
        order,
        {
          name: order.clientName,
          email: order.clientEmail || '',
          phone: order.clientPhone || ''
        },
        order.items,
        formatCurrency,
        logoUrl,
        companyData
      );

      doc.save(`${order.orderNumber}.pdf`);
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      alert('Error al descargar el PDF');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendiente',
      'in-progress': 'En Progreso',
      completed: 'Completado',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground mt-1">
          Gestión de pedidos y seguimiento de entregas
        </p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Lista de Pedidos</h2>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in-progress">En Progreso</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground py-8">
                No hay pedidos registrados
              </div>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => {
            const isUrgent = isDeliveryDateUrgent(order.deliveryDate);
            const deliveryDateColor = isUrgent ? 'text-red-600 font-bold' : 'text-muted-foreground';
            
            return (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Pedido #{order.orderNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cliente: {order.clientName}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{formatCurrency(order.total)}</div>
                      <p className={`text-sm ${deliveryDateColor}`}>
                        {order.deliveryDate && order.deliveryDate.toDate
                            ? format(order.deliveryDate.toDate(), 'dd/MM/yyyy', { locale: es })                         : 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Order Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Método de Pago</p>
                        <p className="font-medium">
                          {order.paymentMethod === 'cash'
                            ? 'Efectivo'
                            : order.paymentMethod === 'transfer'
                            ? 'Transferencia'
                            : 'Fiado'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Productos</p>
                        <p className="font-medium">{order.items?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Creado</p>
                        <p className="font-medium">
                          {order.createdAt && order.createdAt.toDate
                            ? format(order.createdAt.toDate(), 'dd/MM/yyyy', { locale: es })
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Estado</p>
                        <div className="flex gap-2 items-center">
                          {editingOrder === order.id ? (
                            <Select value={newStatus} onValueChange={(value) => {
                              handleStatusChange(order.id, value);
                            }}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="in-progress">En Progreso</SelectItem>
                                <SelectItem value="completed">Completado</SelectItem>
                                <SelectItem value="cancelled">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status || 'pending')}`}>
                                {getStatusLabel(order.status || 'pending')}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingOrder(order.id);
                                  setNewStatus(order.status || 'pending');
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Products Summary */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium mb-2">Productos:</p>
                      <div className="space-y-1 text-sm">
                        {order.items?.slice(0, 3).map((item, idx) => (
                          <p key={idx} className="text-muted-foreground">
                            • {item.productName} x{item.quantity}
                          </p>
                        ))}
                        {order.items?.length > 3 && (
                          <p className="text-muted-foreground">
                            • +{order.items.length - 3} más
                          </p>
                        )}
                      </div>
                    </div>

	                    {/* Actions */}
	                    <div className="flex gap-2">
	                      <Button
                        onClick={() => handleViewPDF(order)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver PDF
                      </Button>
                      <Button
                        onClick={() => handleDownloadPDF(order)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <FileText className="h-4 w-4 mr-2" />
	                        Descargar
	                      </Button>
	                      {order.status === 'cancelled' && (
	                        <Button
	                          onClick={() => handleDeleteOrder(order.id)}
	                          variant="destructive"
	                          size="sm"
	                          className="flex-1"
	                        >
	                          <Trash2 className="h-4 w-4 mr-2" />
	                          Eliminar
	                        </Button>
	                      )}
	                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vista Previa - Pedido #{selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[600px] bg-gray-100 rounded-lg overflow-auto">
            {selectedOrder && (
              <iframe
                src={`data:application/pdf;base64,${selectedOrder.pdfData || ''}`}
                className="w-full h-full"
                title="PDF Preview"
              />
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setPdfDialogOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              onClick={() => {
                handleDownloadPDF(selectedOrder);
                setPdfDialogOpen(false);
              }}
            >
              Descargar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
