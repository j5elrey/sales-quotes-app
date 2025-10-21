
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateQuotePDF } from '@/lib/pdfUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Quotes = () => {
  const { id } = useParams(); // Aunque `id` no se usa directamente aquí, se mantiene por si hay futuras expansiones.
  const { currentUser } = useAuth();
  const { formatCurrency } = useSettings();
  const navigate = useNavigate();
  
  const [quotes, setQuotes] = useState([]);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [loading, setLoading] = useState(true); // Estado de carga
  const [error, setError] = useState(null); // Estado de error

  useEffect(() => {
    loadQuotes();
  }, [currentUser]); // Dependencia de currentUser para recargar si el usuario cambia

  const loadQuotes = async () => {
    if (!currentUser) {
      setQuotes([]); // Limpiar cotizaciones si no hay usuario autenticado
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(db, 'quotes'));
      const quotesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Asegurarse de que createdAt sea un Timestamp antes de llamar a toDate()
      setQuotes(quotesData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      }));
    } catch (err) {
      console.error('Error al cargar cotizaciones:', err);
      setError('Error al cargar las cotizaciones. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToSale = async (quoteId) => {
    try {
      await updateDoc(doc(db, 'quotes', quoteId), {
        status: 'converted',
        convertedAt: new Date()
      });
      
      // Navegar para crear venta con datos de cotización
      navigate(`/sales/new?quoteId=${quoteId}`);
    } catch (error) {
      console.error("Error al convertir cotización:", error);
      alert("Error al convertir la cotización a venta.");
    }
  };

  const handleViewPDF = async (quote) => {
    setSelectedQuote(quote);
    setPdfDialogOpen(true);

    // Generar el PDF y guardarlo en el estado para la vista previa
    try {
      // Obtener datos de la compañía y logo del localStorage (si existen)
      const logoUrl = localStorage.getItem("logoUrl");
      const companyDataStr = localStorage.getItem("companyData");
      const companyData = companyDataStr ? JSON.parse(companyDataStr) : null;

      const doc = await generateQuotePDF(
        quote,
        {
          name: quote.clientName,
          email: quote.clientEmail || "",
          phone: quote.clientPhone || "",
        },
        quote.items,
        formatCurrency, // Usar la función formatCurrency del contexto
        currentUser.uid,
        logoUrl, // Pasar logoUrl
        companyData // Pasar companyData
      );
      const pdfData = doc.output("datauristring");
      setSelectedQuote((prev) => ({ ...prev, pdfData }));
    } catch (error) {
      console.error("Error al generar PDF para vista previa:", error);
      alert("Error al generar el PDF para vista previa");
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      sent: 'default',
      converted: 'secondary',
      pending: 'outline'
    };
    
    const labels = {
      sent: 'Enviada',
      converted: 'Convertida',
      pending: 'Pendiente'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Cargando cotizaciones...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Cotizaciones</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tus cotizaciones
            </p>
          </div>
          <Button onClick={() => navigate('/quotes/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cotización
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Cotizaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay cotizaciones registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-mono text-sm">
                        {quote.id.substring(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>{quote.clientName}</TableCell>
                      <TableCell>
                        {quote.createdAt && format(quote.createdAt.toDate(), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>{formatCurrency(quote.total)}</TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPDF(quote)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {quote.status !== 'converted' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConvertToSale(quote.id)}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vista Previa - Cotización #{selectedQuote?.id.substring(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[600px] bg-gray-100 rounded-lg overflow-auto">
            {selectedQuote && selectedQuote.pdfData && (
              <iframe
                src={selectedQuote.pdfData}
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
            {/* Puedes añadir un botón para descargar aquí si lo deseas */}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Quotes;

