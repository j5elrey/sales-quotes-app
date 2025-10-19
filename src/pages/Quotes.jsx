import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Share2, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Quotes = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    loadQuotes();
  }, [currentUser]);

  const loadQuotes = async () => {
    if (!currentUser) return;
    
    try {
      const querySnapshot = await getDocs(collection(db, 'quotes'));
      const quotesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setQuotes(quotesData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    } catch (error) {
      console.error('Error al cargar cotizaciones:', error);
    }
  };

  const handleConvertToSale = async (quoteId) => {
    try {
      await updateDoc(doc(db, 'quotes', quoteId), {
        status: 'converted',
        convertedAt: new Date()
      });
      
      // Navigate to create sale with quote data
      navigate(`/sales/new?quoteId=${quoteId}`);
    } catch (error) {
      console.error('Error al convertir cotización:', error);
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

  return (
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
                    <TableCell>${quote.total?.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/quotes/${quote.id}`)}
                      >
                        <FileText className="h-4 w-4" />
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
  );
};

export default Quotes;

