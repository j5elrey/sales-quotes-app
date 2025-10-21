
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Mail, MessageCircle, FileDown } from 'lucide-react';
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
  const [selectedClient, setSelectedClient] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [includeIVA, setIncludeIVA] = useState(true);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [change, setChange] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [bankData, setBankData] = useState({ bank: '', accountNumber: '', accountHolder: '' });
  const [companyData, setCompanyData] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareMethod, setShareMethod] = useState('download');
  const [shareEmail, setShareEmail] = useState('');
  const [sharePhone, setSharePhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        await loadClients();
        await loadProducts();
        await loadUserSettings(); // Cargar configuración del usuario (incluye datos bancarios)

        if (id) {
          await loadSaleData(id);
        } else if (quoteId) {
          await loadQuoteData(quoteId);
        }
      } catch (err) {
        setError('Error al cargar datos iniciales: ' + err.message);
        console.error('Error al cargar datos iniciales:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser, id, quoteId]);

  useEffect(() => {
    calculateTotal();
  }, [items, includeIVA, discountPercentage]);

  useEffect(() => {
    if (paymentMethod === 'cash' && amountPaid > 0) {
      setChange(amountPaid - total);
    } else {
      setChange(0);
    }
  }, [amountPaid, total, paymentMethod]);

  const loadUserSettings = async () => {
    if (!currentUser) return;
    try {
      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      const docSnap = await getDoc(userSettingsRef);
      if (docSnap.exists()) {
        const settings = docSnap.data();
        setBankData(settings.bankData || { bank: '', accountNumber: '', accountHolder: '' });
        setCompanyData(settings.companyData || null);
        setLogoUrl(settings.logoUrl || null);
      }
    } catch (err) {
      console.error('Error al cargar la configuración del usuario:', err);
    }
  };

  const loadClients = async () => {
    if (!currentUser) return;
    try {
      const querySnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(clientsData);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      throw new Error('No se pudieron cargar los clientes.');
    }
  };

  const loadProducts = async () => {
    if (!currentUser) return;
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      throw new Error('No se pudieron cargar los productos.');
    }
  };

  const loadSaleData = async (saleId) => {
    try {
      const saleDoc = await getDoc(doc(db, 'sales', saleId));
      if (saleDoc.exists()) {
        const saleData = saleDoc.data();
        setSelectedClient(saleData.clientId);
        setItems(saleData.items.map(item => ({
          productId: item.productId,
          product: products.find(p => p.id === item.productId) || { name: item.productName, type: item.productType, price: item.productPrice },
          length: item.length || 1,
          width: item.width || 1,
          quantity: item.quantity || 1,
          observations: item.observations || ''
        })));
        setIncludeIVA(saleData.includeIVA || true);
        setDiscountPercentage(saleData.discountPercentage || 0);
        setDeliveryDate(saleData.deliveryDate ? format(saleData.deliveryDate.toDate(), 'yyyy-MM-dd') : '');
        setPaymentMethod(saleData.paymentMethod || 'cash');
        setAmountPaid(saleData.amountPaid || 0);
        setAdvance(saleData.advance || 0);
        // Asegurarse de cargar bankData si el método de pago es transferencia
        if (saleData.paymentMethod === 'transfer' && saleData.bankData) {
          setBankData(saleData.bankData);
        }
      } else {
        console.warn('Venta no encontrada:', saleId);
        navigate('/sales/new');
      }
    } catch (err) {
      console.error('Error al cargar venta:', err);
      throw new Error('No se pudo cargar la venta.');
    }
  };

  const loadQuoteData = async (quoteId) => {
    try {
      const quoteDoc = await getDoc(doc(db, 'quotes', quoteId));
      if (quoteDoc.exists()) {
        const quoteData = quoteDoc.data();
        setSelectedClient(quoteData.clientId);
        const loadedProducts = await getDocs(collection(db, 'products')).then(snapshot => snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setProducts(loadedProducts);

        setItems(quoteData.items.map(item => {
          const product = loadedProducts.find(p => p.id === item.productId);
          return {
            productId: item.productId,
            product: product || { name: item.productName, type: item.productType, price: item.productPrice },
            length: item.length || 1,
            width: item.width || 1,
            quantity: item.quantity || 1,
            observations: item.observations || ''
          };
        }));
        setIncludeIVA(quoteData.includeIVA || true);
        setDiscountPercentage(quoteData.discountPercentage || 0);
      } else {
        console.warn('Cotización no encontrada:', quoteId);
        alert('Cotización no encontrada. Creando una nueva venta.');
        navigate('/sales/new', { replace: true });
      }
    } catch (err) {
      console.error('Error al cargar cotización para venta:', err);
      throw new Error('No se pudo cargar la cotización para la venta.');
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
      quantity: 1,
      observations: ''
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
    } else if (field === 'observations') {
      newItems[index][field] = value;
    } else {
      newItems[index][field] = parseFloat(value) || 0;
    }
    setItems(newItems);
  };

  const calculateTotal = () => {
    let sum = items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
    if (discountPercentage > 0) {
      sum *= (1 - discountPercentage / 100);
    }
    if (includeIVA) {
      sum *= 1.16;
    }
    setTotal(sum);
  };

  const generateOrderNumber = () => {
    return `PED-${Date.now().toString().slice(-8)}`;
  };

  const handleGeneratePDF = async (saleId) => {
    try {
        const saleDoc = await getDoc(doc(db, 'sales', saleId));
        if (!saleDoc.exists()) {
            alert('No se encontró la venta para generar el PDF.');
            return;
        }
        const saleData = saleDoc.data();
        const client = clients.find(c => c.id === saleData.clientId);

        const pdfDoc = await generateSalePDF(
            { ...saleData, id: saleId },
            client,
            saleData.items,
            formatCurrency,
            currentUser.uid
        );

        if (pdfDoc) { // Verificar si pdfDoc es válido
            if (shareMethod === 'download') {
                pdfDoc.save(`Venta_${client.name}_${new Date().toLocaleDateString()}.pdf`);
            } else if (shareMethod === 'email') {
                sharePDF(pdfDoc, 'email', shareEmail, `Ticket de Venta de ${client.name}`);
            } else if (shareMethod === 'whatsapp') {
                sharePDF(pdfDoc, 'whatsapp', sharePhone, `Ticket de Venta de ${client.name}`);
            }
        } else {
            alert('Error: El PDF no se pudo generar.');
        }
    } catch (error) {
        console.error('Error al generar/compartir PDF:', error);
        alert('Error al generar o compartir el PDF.');
    }
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
    if (paymentMethod === 'credit' && advance === 0 && total > 0) {
      alert('Debes ingresar un anticipo para ventas a fiado si el total es mayor a 0');
      return;
    }

    try {
      const client = clients.find(c => c.id === selectedClient);
      const orderNumber = id ? null : generateOrderNumber();

      const saleData = {
        userId: currentUser.uid,
        clientId: selectedClient,
        clientName: client.name,
        clientEmail: client.email || '',
        clientPhone: client.phone || '',
        items: items.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          productType: item.product.type,
          productPrice: item.product.price,
          length: item.length,
          width: item.width,
          quantity: item.quantity,
          observations: item.observations || '',
          total: calculateItemTotal(item)
        })),
        total: total,
        orderNumber: id ? (await getDoc(doc(db, 'sales', id))).data().orderNumber : orderNumber,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        paymentMethod: paymentMethod,
        amountPaid: paymentMethod === 'cash' ? parseFloat(amountPaid) : null,
        change: paymentMethod === 'cash' ? change : null,
        advance: paymentMethod === 'credit' ? parseFloat(advance) : null,
        status: 'pending',
        includeIVA: includeIVA,
        discountPercentage: discountPercentage,
        bankData: paymentMethod === 'transfer' ? bankData : null, // Usa los datos bancarios del estado
        createdAt: id ? (await getDoc(doc(db, 'sales', id))).data().createdAt : new Date(),
        updatedAt: new Date(),
      };

      let docRef;
      if (id) {
        await updateDoc(doc(db, 'sales', id), saleData);
        alert('Venta actualizada con éxito!');
        docRef = { id: id };
      } else {
        docRef = await addDoc(collection(db, 'sales'), saleData);
        alert('Venta guardada con éxito!');
      }

      sessionStorage.setItem('lastSaleId', docRef.id);
      setShareDialogOpen(true);

    } catch (err) {
      console.error('Error al guardar venta:', err);
      alert('Error al guardar la venta: ' + err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando formulario...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{id ? 'Editar Venta' : 'Nueva Venta'}</h1>
        <p className="text-muted-foreground mt-1">
          {id ? 'Edita los detalles de la venta existente' : 'Registra una nueva venta y genera el ticket'}
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
              {items.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No hay productos agregados
                </div>
              )}
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
                    <div className="md:col-span-2">
                      <Label>Observaciones</Label>
                      <Input
                        type="text"
                        placeholder="Observaciones del producto"
                        value={item.observations}
                        onChange={(e) => updateItem(index, 'observations', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Tipo: {item.product?.type === 'm2' ? 'Metro cuadrado' : 'Metro lineal'}
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles de Pago y Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="deliveryDate">Fecha de Entrega</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="paymentMethod">Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="credit">Fiado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'cash' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amountPaid">Monto Pagado</Label>
                    <Input
                      id="amountPaid"
                      type="number"
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Cambio:</span>
                    <span>{formatCurrency(change)}</span>
                  </div>
                </div>
              )}

              {paymentMethod === 'credit' && (
                <div>
                  <Label htmlFor="advance">Anticipo</Label>
                  <Input
                    id="advance"
                    type="number"
                    step="0.01"
                    value={advance}
                    onChange={(e) => setAdvance(parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}

              {paymentMethod === 'transfer' && (
                <div className="space-y-2 p-4 border rounded-md bg-gray-50">
                  <h4 className="font-semibold">Datos para la Transferencia</h4>
                  <p><strong>Banco:</strong> {bankData.bank || 'No especificado'}</p>
                  <p><strong>Cuenta:</strong> {bankData.accountNumber || 'No especificado'}</p>
                  <p><strong>Titular:</strong> {bankData.accountHolder || 'No especificado'}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen y Opciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="includeIVA" className="text-lg">Incluir IVA (16%)</Label>
                <Input
                  id="includeIVA"
                  type="checkbox"
                  checked={includeIVA}
                  onChange={(e) => setIncludeIVA(e.target.checked)}
                  className="w-5 h-5"
                />
              </div>

              <div>
                <Label htmlFor="discount" className="text-lg">Descuento</Label>
                <Select value={discountPercentage.toString()} onValueChange={(value) => setDiscountPercentage(parseFloat(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un descuento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="15">15%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between items-center text-2xl font-bold">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1">
            {id ? 'Actualizar Venta' : 'Guardar Venta'}
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
            
            <Button onClick={() => handleGeneratePDF(sessionStorage.getItem('lastSaleId'))} className="w-full">
              Generar y Compartir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesForm;


