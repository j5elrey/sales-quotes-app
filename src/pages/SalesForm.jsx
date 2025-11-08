import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, query, where } from 'firebase/firestore';
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
  const [processDialogOpen, setProcessDialogOpen] = useState(false); // Nuevo estado

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
        await loadUserSettings();

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
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
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
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
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
    const availableProducts = products.filter(p => p.category !== 'proceso');
    if (availableProducts.length === 0) {
      alert('Primero debes agregar productos en la sección de Productos');
      return;
    }
    setItems([...items, {
      productId: availableProducts[0].id,
      product: availableProducts[0],
      length: 1,
      width: 1,
      quantity: 1,
      observations: ''
    }]);
  };

  const addProcess = () => {
    const availableProcesses = products.filter(p => p.category === 'proceso');
    if (availableProcesses.length === 0) {
      alert('Primero debes agregar procesos en la sección de Productos');
      return;
    }
    setProcessDialogOpen(true);
  };

  const handleSelectProcess = (processId) => {
    const selectedProcess = products.find(p => p.id === processId);
    if (selectedProcess) {
      setItems([...items, {
        productId: selectedProcess.id,
        product: selectedProcess,
        length: 1,
        width: 1,
        quantity: 1,
        observations: ''
      }]);
      setProcessDialogOpen(false);
    }
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
      // Asegurar que los campos numéricos se mantengan como números al cambiar de producto
      newItems[index].length = newItems[index].length || 1;
      newItems[index].width = newItems[index].width || 1;
      newItems[index].quantity = newItems[index].quantity || 1;
    } else if (field === 'observations') {
      newItems[index][field] = value;
    } else {
      // Asegurar que los valores numéricos se guarden como números
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

        if (pdfDoc) {
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

    try {
      const client = clients.find(c => c.id === selectedClient);

      // CORRECCIÓN 1: Generar el número de pedido y recuperarlo si estamos editando
      const orderNumber = id ? (await getDoc(doc(db, 'sales', id))).data().orderNumber : generateOrderNumber();

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
        includeIVA: includeIVA,
        discountPercentage: discountPercentage,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        paymentMethod: paymentMethod,
        amountPaid: parseFloat(amountPaid) || 0,
        advance: parseFloat(advance) || 0,
        status: 'pending',
        createdAt: id ? (await getDoc(doc(db, 'sales', id))).data().createdAt : new Date(),
        updatedAt: new Date(),
        orderNumber: orderNumber, // Agregar el número de pedido
      };

      let docRef;
      if (id) {
        await updateDoc(doc(db, 'sales', id), saleData);
        alert('Venta actualizada con éxito!');
        docRef = { id: id };
      } else {
        docRef = await addDoc(collection(db, 'sales'), saleData);
        alert('Venta guardada con éxito!');
        
        // CORRECCIÓN 2: Eliminar la navegación y en su lugar recargar los datos de la venta
        // para que el componente tenga el orderNumber y el ID correctos para el PDF.
        await loadSaleData(docRef.id);
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

  const availableProcesses = products.filter(p => p.category === 'proceso');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{id ? 'Editar Venta' : 'Nueva Venta'}</h1>
        <p className="text-muted-foreground mt-1">
          {id ? 'Edita los detalles de la venta existente' : 'Registra una nueva venta'}
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
                        {client.name}
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
            <div className="flex justify-between items-center gap-2">
              <CardTitle>Productos</CardTitle>
              <div className="flex gap-2">
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Producto
                </Button>
                {availableProcesses.length > 0 && (
                  <Button type="button" onClick={addProcess} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Proceso
                  </Button>
                )}
              </div>
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
                        disabled={item.product?.type === 'unidad' || item.product?.type === 'proceso'}
                      />
                    </div>
                    <div>
                      <Label>Ancho (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.width}
                        onChange={(e) => updateItem(index, 'width', e.target.value)}
                        disabled={item.product?.type === 'unidad' || item.product?.type === 'proceso'}
                      />
                    </div>
                    <div>
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        disabled={item.product?.type === 'metro_cuadrado' || item.product?.type === 'metro_lineal'}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Observaciones (Opcional)</Label>
                    <Input
                      type="text"
                      value={item.observations}
                      onChange={(e) => updateItem(index, 'observations', e.target.value)}
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <p className="font-semibold">Subtotal: {formatCurrency(calculateItemTotal(item))}</p>
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen y Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Fecha de Entrega (Opcional)</Label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Descuento (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeIVA"
                checked={includeIVA}
                onChange={(e) => setIncludeIVA(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <Label htmlFor="includeIVA">Incluir IVA (16%)</Label>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between font-medium">
                <span>Subtotal (sin IVA/Desc.):</span>
                <span>{formatCurrency(items.reduce((acc, item) => acc + calculateItemTotal(item), 0))}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Descuento Aplicado:</span>
                <span>{formatCurrency(items.reduce((acc, item) => acc + calculateItemTotal(item), 0) * (discountPercentage / 100))}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>IVA (16%):</span>
                <span>{formatCurrency(includeIVA ? (total / 1.16) * 0.16 : 0)}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold text-indigo-600">
                <span>TOTAL:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div>
                <Label>Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <Label>Monto Pagado (Efectivo)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  />
                  <p className={`mt-2 font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Cambio: {formatCurrency(change)}
                  </p>
                </div>
              )}

              {paymentMethod === 'transfer' && (
                <div className="space-y-2">
                  <Label>Anticipo/Monto Transferido</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={advance}
                    onChange={(e) => setAdvance(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Datos bancarios: {bankData.bank} - {bankData.accountNumber}
                  </p>
                </div>
              )}

              {paymentMethod === 'credit' && (
                <div>
                  <Label>Anticipo/Monto a Crédito</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={advance}
                    onChange={(e) => setAdvance(parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full">
              {id ? 'Actualizar Venta' : 'Guardar Venta'}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Dialogo de Procesos */}
      <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar Proceso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Selecciona el proceso que deseas agregar a la venta:</p>
            {availableProcesses.map(process => (
              <Button
                key={process.id}
                onClick={() => handleSelectProcess(process.id)}
                variant="outline"
                className="w-full justify-start"
              >
                {process.name} - {formatCurrency(process.price)}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogo de Compartir */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartir Ticket de Venta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              La venta ha sido guardada. Selecciona cómo deseas compartir el ticket/factura.
            </p>

            <div className="grid grid-cols-3 gap-4">
              <Button
                variant={shareMethod === 'download' ? 'default' : 'outline'}
                onClick={() => setShareMethod('download')}
              >
                <FileDown className="h-4 w-4 mr-2" /> Descargar
              </Button>
              <Button
                variant={shareMethod === 'email' ? 'default' : 'outline'}
                onClick={() => setShareMethod('email')}
              >
                <Mail className="h-4 w-4 mr-2" /> Email
              </Button>
              <Button
                variant={shareMethod === 'whatsapp' ? 'default' : 'outline'}
                onClick={() => setShareMethod('whatsapp')}
              >
                <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
            </div>

            {shareMethod === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="share-email">Email del Cliente</Label>
                <Input
                  id="share-email"
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="ejemplo@cliente.com"
                />
                <Button
                  className="w-full"
                  onClick={() => handleGeneratePDF(sessionStorage.getItem('lastSaleId'))}
                >
                  Enviar por Email
                </Button>
              </div>
            )}

            {shareMethod === 'whatsapp' && (
              <div className="space-y-2">
                <Label htmlFor="share-phone">Teléfono del Cliente (WhatsApp)</Label>
                <Input
                  id="share-phone"
                  type="tel"
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                  placeholder="Ej: 5215512345678"
                />
                <Button
                  className="w-full"
                  onClick={() => handleGeneratePDF(sessionStorage.getItem('lastSaleId'))}
                >
                  Enviar por WhatsApp
                </Button>
              </div>
            )}

            {shareMethod === 'download' && (
              <Button
                className="w-full"
                onClick={() => handleGeneratePDF(sessionStorage.getItem('lastSaleId'))}
              >
                Descargar PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesForm;
