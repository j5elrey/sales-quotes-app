
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { generateQuotePDF, calculateItemTotal } from '@/lib/pdfUtils';
import { sharePDF } from '@/lib/shareUtils';

const QuoteForm = () => {
  const { id } = useParams();
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareMethod, setShareMethod] = useState('download');
  const [shareEmail, setShareEmail] = useState('');
  const [sharePhone, setSharePhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

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
        await loadUserSettings(); // Cargar configuración del usuario

        if (id) {
          await loadQuoteData(id);
        }
      } catch (err) {
        setError('Error al cargar datos iniciales: ' + err.message);
        console.error('Error al cargar datos iniciales:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser, id]);

  useEffect(() => {
    calculateTotal();
  }, [items, includeIVA, discountPercentage]);

  const loadUserSettings = async () => {
    if (!currentUser) return;
    try {
      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      const docSnap = await getDoc(userSettingsRef);
      if (docSnap.exists()) {
        const settings = docSnap.data();
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

  const loadQuoteData = async (quoteId) => {
    try {
      const quoteDoc = await getDoc(doc(db, 'quotes', quoteId));
      if (quoteDoc.exists()) {
        const quoteData = quoteDoc.data();
        setSelectedClient(quoteData.clientId);
        setItems(quoteData.items.map(item => ({
          productId: item.productId,
          product: products.find(p => p.id === item.productId) || { name: item.productName, type: item.productType, price: item.productPrice },
          length: item.length || 1,
          width: item.width || 1,
          quantity: item.quantity || 1,
          observations: item.observations || ''
        })));
        setIncludeIVA(quoteData.includeIVA || true);
        setDiscountPercentage(quoteData.discountPercentage || 0);
      } else {
        console.warn('Cotización no encontrada:', quoteId);
        navigate('/quotes/new');
      }
    } catch (err) {
      console.error('Error al cargar cotización:', err);
      throw new Error('No se pudo cargar la cotización.');
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

  const handleGeneratePDF = async (quoteId) => {
    try {
        const quoteDoc = await getDoc(doc(db, 'quotes', quoteId));
        if (!quoteDoc.exists()) {
            alert('No se encontró la cotización para generar el PDF.');
            return;
        }
        const quoteData = quoteDoc.data();
        const client = clients.find(c => c.id === quoteData.clientId);

        const pdfDoc = await generateQuotePDF(
            { ...quoteData, id: quoteId },
            client,
            quoteData.items,
            formatCurrency,
            currentUser.uid
        );

        if (shareMethod === 'download') {
            pdfDoc.save(`Cotizacion_${client.name}_${new Date().toLocaleDateString()}.pdf`);
        } else if (shareMethod === 'email') {
            sharePDF(pdfDoc, 'email', shareEmail, `Cotización de ${client.name}`);
        } else if (shareMethod === 'whatsapp') {
            sharePDF(pdfDoc, 'whatsapp', sharePhone, `Cotización de ${client.name}`);
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

      const quoteData = {
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
        createdAt: id ? (await getDoc(doc(db, 'quotes', id))).data().createdAt : new Date(),
        updatedAt: new Date(),
      };

      let docRef;
      if (id) {
        await updateDoc(doc(db, 'quotes', id), quoteData);
        alert('Cotización actualizada con éxito!');
        docRef = { id: id };
      } else {
        docRef = await addDoc(collection(db, 'quotes'), quoteData);
        alert('Cotización guardada con éxito!');
      }

      sessionStorage.setItem('lastQuoteId', docRef.id);
      setShareDialogOpen(true);

    } catch (err) {
      console.error('Error al guardar cotización:', err);
      alert('Error al guardar la cotización: ' + err.message);
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
        <h1 className="text-3xl font-bold">{id ? 'Editar Cotización' : 'Nueva Cotización'}</h1>
        <p className="text-muted-foreground mt-1">
          {id ? 'Edita los detalles de la cotización existente' : 'Registra una nueva cotización y genera el PDF'}
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
            {id ? 'Actualizar Cotización' : 'Guardar Cotización'}
          </Button>
        </div>
      </form>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartir Cotización</DialogTitle>
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
            
            <Button onClick={() => handleGeneratePDF(sessionStorage.getItem('lastQuoteId'))} className="w-full">
              Generar y Compartir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuoteForm;

