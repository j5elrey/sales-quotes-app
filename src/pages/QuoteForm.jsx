import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, getDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, FileDown, Mail, MessageCircle } from 'lucide-react';
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
  const [selectedClient, setSelectedClient] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareMethod, setShareMethod] = useState('download');
  const [shareEmail, setShareEmail] = useState('');
  const [sharePhone, setSharePhone] = useState('');

  useEffect(() => {
    loadClients();
    loadProducts();
  }, [currentUser]);

  useEffect(() => {
    calculateTotal();
  }, [items]);

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
        status: 'pending',
        createdAt: new Date()
      };
      
      await addDoc(collection(db, 'quotes'), quoteData);
      navigate('/quotes');
    } catch (error) {
      console.error('Error al guardar cotización:', error);
      alert('Error al guardar la cotización');
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedClient || items.length === 0) {
      alert('Completa la cotización antes de generar el PDF');
      return;
    }
    
    const client = clients.find(c => c.id === selectedClient);
    const logoUrl = localStorage.getItem('logoUrl');
    const companyDataStr = localStorage.getItem('companyData');
    const companyData = companyDataStr ? JSON.parse(companyDataStr) : null;
    const quote = { id: Date.now().toString(), total };
    
    const doc = await generateQuotePDF(quote, client, items, formatCurrency, logoUrl, companyData);
    
    try {
      const filename = `cotizacion_${quote.id.substring(0, 8).toUpperCase()}.pdf`;
      await sharePDF(doc, filename, {
        method: shareMethod,
        email: shareEmail || client.email,
        phone: sharePhone || client.phone,
        subject: `Cotización #${quote.id.substring(0, 8)}`,
        message: `Estimado/a ${client.name}, adjunto encontrarás la cotización solicitada.`
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
        <h1 className="text-3xl font-bold">Nueva Cotización</h1>
        <p className="text-muted-foreground mt-1">
          Crea una cotización para tus clientes
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
          <CardContent className="pt-6">
            <div className="flex justify-between items-center text-2xl font-bold">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1">
            Guardar Cotización
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
            
            <Button onClick={handleGeneratePDF} className="w-full">
              Generar y Compartir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuoteForm;
