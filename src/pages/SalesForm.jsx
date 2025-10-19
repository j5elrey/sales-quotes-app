import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, getDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, FileDown, Mail, MessageCircle, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { generateSalePDF, calculateItemTotal } from '@/lib/pdfUtils';
import { sharePDF } from '@/lib/shareUtils';
import { format } from 'date-fns';

const SalesForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const { currentUser } = useAuth();
  const { formatCurrency } = useSettings();
  const navigate = useNavigate();
  
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [change, setChange] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [bankData, setBankData] = useState({
    bank: 'Banco XYZ',
    accountNumber: '1234567890',
    accountHolder: 'Empresa XYZ'
  });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareMethod, setShareMethod] = useState('download');
  const [shareEmail, setShareEmail] = useState('');
  const [sharePhone, setSharePhone] = useState('');

  useEffect(() => {
    loadClients();
    loadProducts();
    if (quoteId) {
      loadQuoteData(quoteId);
    }
  }, [currentUser, quoteId]);

  useEffect(() => {
    calculateTotal();
  }, [items]);

  useEffect(() => {
    if (paymentMethod === 'cash' && amountPaid > 0) {
      setChange(amountPaid - total);
    }
  }, [amountPaid, total, paymentMethod]);

  const loadClients = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsData);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const loadQuoteData = async (quoteId) => {
    try {
      const quoteDoc = await getDoc(doc(db, 'quotes', quoteId));
      if (quoteDoc.exists()) {
        const quoteData = quoteDoc.data();
        setSelectedClient(quoteData.clientId);
        
        // Convertir items de la cotización
        const convertedItems = quoteData.items.map(item => {
          const product = products.find(p => p.id === item.productId);
          return {
            productId: item.productId,
            product: product || { name: item.productName, type: item.productType, price: item.productPrice },
            length: item.length,
            width: item.width,
            quantity: item.quantity
          };
        });
        setItems(convertedItems);
      }
    } catch (error) {
      console.error('Error al cargar cotización:', error);
    }
  };

  const addItem = () => {
    if (products.length === 0) {
      alert('Primero debes agregar productos en la sección de Productos');
      return;
    }
    
    setItems([...items, {
      productId: products[0].id,
      product: products[0],
      length: 1,
      width: 1,
      quantity: 1
    }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      newItems[index].productId = value;
      newItems[index].product = product;
    } else {
      newItems[index][field] = parseFloat(value) || 0;
    }
    
    setItems(newItems);
  };

  const calculateTotal = () => {
    const sum = items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
    setTotal(sum);
  };

  const generateOrderNumber = () => {
    return `PED-${Date.now().toString().slice(-8)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedClient) {
      alert('Selecciona un cliente');
      return;
    }
    
    if (items.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }

    if (paymentMethod === 'cash' && amountPaid < total) {
      alert('El monto pagado debe ser mayor o igual al total');
      return;
    }

    if (paymentMethod === 'credit' && advance > total) {
      alert('El anticipo no puede ser mayor al total');
      return;
    }

    if (paymentMethod === 'credit' && advance === 0) {
      alert('Debes ingresar un anticipo para ventas a fiado');
      return;
    }
    
    try {
      const client = clients.find(c => c.id === selectedClient);
      const orderNumber = generateOrderNumber();
      
      const saleData = {
        userId: currentUser.uid,
        clientId: selectedClient,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        items: items.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          productType: item.product.type,
          productPrice: item.product.price,
          length: item.length,
          width: item.width,
          quantity: item.quantity,
          total: calculateItemTotal(item)
        })),
        total: total,
        orderNumber: orderNumber,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        paymentMethod: paymentMethod,
        amountPaid: paymentMethod === 'cash' ? parseFloat(amountPaid) : null,
        change: paymentMethod === 'cash' ? change : null,
        advance: paymentMethod === 'credit' ? parseFloat(advance) : null,
        status: 'pending',
        createdAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'sales'), saleData);
      
      // Mostrar diálogo para compartir
      setShareDialogOpen(true);
      
      // Guardar el ID de la venta y número de pedido para generar PDF
      sessionStorage.setItem('lastSaleId', docRef.id);
      sessionStorage.setItem('lastSaleData', JSON.stringify(saleData));
      sessionStorage.setItem('lastOrderNumber', orderNumber);
      
    } catch (error) {
      console.error('Error al guardar venta:', error);
      alert('Error al guardar la venta');
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedClient || items.length === 0) {
      alert('Completa la venta antes de generar el PDF');
      return;
    }
    
    const client = clients.find(c => c.id === selectedClient);
    const logoUrl = localStorage.getItem('logoUrl');
    const companyDataStr = localStorage.getItem('companyData');
    const companyData = companyDataStr ? JSON.parse(companyDataStr) : null;
    
    // Obtener el número de pedido del último guardado
    const lastOrderNumber = sessionStorage.getItem('lastOrderNumber');
    
    const sale = { 
      id: Date.now().toString(), 
      total,
      orderNumber: lastOrderNumber || generateOrderNumber(),
      paymentMethod,
      amountPaid,
      change,
      advance,
      deliveryDate
    };
    
    const doc = await generateSalePDF(sale, client, items, formatCurrency, logoUrl, companyData);
    
    try {
      const filename = `${sale.orderNumber}.pdf`;
      await sharePDF(doc, filename, {
        method: shareMethod,
        email: shareEmail || client.email,
        phone: sharePhone || client.phone,
        subject: `Ticket de Venta #${sale.orderNumber}`,
        message: `Estimado/a ${client.name}, adjunto encontrarás el ticket de tu venta.`
      });
      
      setShareDialogOpen(false);
      alert('PDF generado exitosamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nueva Venta</h1>
        <p className="text-muted-foreground mt-1">
          Registra una nueva venta y genera el ticket
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Productos</CardTitle>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                      <Label>Producto</Label>
                      <Select
                        value={item.productId}
                        onValueChange={(value) => updateItem(index, 'productId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {formatCurrency(product.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Largo (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.length}
                        onChange={(e) => updateItem(index, 'length', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Ancho (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.width}
                        onChange={(e) => updateItem(index, 'width', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Tipo: {item.product.type === 'm2' ? 'Metro cuadrado' : 'Metro lineal'}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-semibold">
                        Total: {formatCurrency(calculateItemTotal(item))}
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {items.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No hay productos agregados
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fecha de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="delivery-date">Fecha</Label>
              <Input
                id="delivery-date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Método de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cash">Efectivo</TabsTrigger>
                <TabsTrigger value="transfer">Transferencia</TabsTrigger>
                <TabsTrigger value="credit">Fiado</TabsTrigger>
              </TabsList>
              
              <TabsContent value="cash" className="space-y-4">
                <div>
                  <Label htmlFor="amount-paid">Monto Pagado</Label>
                  <Input
                    id="amount-paid"
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total a pagar:</p>
                  <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                  {change > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground mt-2">Cambio:</p>
                      <p className="text-xl font-semibold text-green-600">{formatCurrency(change)}</p>
                    </>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="transfer" className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                  <p className="font-semibold">Datos Bancarios</p>
                  <p className="text-sm"><span className="font-semibold">Banco:</span> {bankData.bank}</p>
                  <p className="text-sm"><span className="font-semibold">Cuenta:</span> {bankData.accountNumber}</p>
                  <p className="text-sm"><span className="font-semibold">Titular:</span> {bankData.accountHolder}</p>
                  <p className="text-sm mt-3"><span className="font-semibold">Total a transferir:</span> {formatCurrency(total)}</p>
                </div>
              </TabsContent>
              
              <TabsContent value="credit" className="space-y-4">
                <div>
                  <Label htmlFor="advance">Anticipo</Label>
                  <Input
                    id="advance"
                    type="number"
                    step="0.01"
                    value={advance}
                    onChange={(e) => setAdvance(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total a pagar:</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(total)}</p>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground">Anticipo recibido:</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(advance)}</p>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground">Saldo pendiente:</p>
                    <p className="text-lg font-semibold text-orange-600">{formatCurrency(Math.max(0, total - advance))}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center text-2xl font-bold">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1">
            Guardar Venta
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShareDialogOpen(true)}
            disabled={!selectedClient || items.length === 0}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Generar PDF
          </Button>
        </div>
      </form>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartir Ticket de Venta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={shareMethod === 'download' ? 'default' : 'outline'}
                onClick={() => setShareMethod('download')}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Descargar
              </Button>
              <Button
                variant={shareMethod === 'email' ? 'default' : 'outline'}
                onClick={() => setShareMethod('email')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                variant={shareMethod === 'whatsapp' ? 'default' : 'outline'}
                onClick={() => setShareMethod('whatsapp')}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            </div>
            
            {shareMethod === 'email' && (
              <div>
                <Label>Email (opcional)</Label>
                <Input
                  type="email"
                  placeholder="Email del cliente"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
              </div>
            )}
            
            {shareMethod === 'whatsapp' && (
              <div>
                <Label>Teléfono (opcional)</Label>
                <Input
                  type="tel"
                  placeholder="Teléfono del cliente"
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                />
              </div>
            )}
            
            <Button onClick={handleGeneratePDF} className="w-full">
              Generar y Compartir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesForm;

