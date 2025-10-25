import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

// Función para formatear moneda
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '$0.00';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
};

// Función para manejar fechas correctamente (sin problemas de zona horaria)
const handleDate = (dateInput) => {
  if (!dateInput) return new Date();
  
  try {
    // Si es un Timestamp de Firebase
    if (dateInput.toDate && typeof dateInput.toDate === 'function') {
      return dateInput.toDate();
    }
    
    // Si ya es una Date
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    // Si es un string o número, crear la fecha localmente
    if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      // Para strings de fecha, usar el método que preserva la fecha local
      const date = new Date(dateInput);
      
      // Ajustar para evitar problemas de zona horaria
      // Crear una nueva fecha usando los componentes locales
      const localDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      
      return localDate;
    }
    
    return new Date();
  } catch (error) {
    console.error('Error procesando fecha:', error);
    return new Date();
  }
};

// Función mejorada para calcular totales que maneja diferentes estructuras
export const calculateItemTotal = (item) => {
  if (!item) return 0;
  
  // Diferentes formas de acceder al precio y tipo
  // La venta guarda el precio del producto en item.productPrice, no en item.product.price
  const basePrice = item.productPrice || item.product?.price || item.unitPrice || item.precio || 0;
  const length = item.length || item.longitud || 1;
  const width = item.width || item.ancho || 1;
  const quantity = item.quantity || item.cantidad || 1;
  // La venta guarda el tipo del producto en item.productType
  const productType = item.productType || item.product?.type || item.tipo || 'ml';
  
  if (productType === 'm2') {
    return basePrice * length * width * quantity;
  } else {
    return basePrice * (length + width) * 2 * quantity;
  }
};

// Función mejorada para obtener información del producto
const getProductInfo = (item) => {
  if (!item) {
    return {
      name: 'Producto no disponible',
      type: 'ml',
      price: 0
    };
  }
  
  // Intentar diferentes estructuras de datos
  let productName = 'Producto no disponible';
  let productType = 'ml';
  let productPrice = 0;
  
  // Caso 1: item tiene product como objeto
  if (item.product && typeof item.product === 'object') {
    productName = item.product.name || item.product.nombre || productName;
    productType = item.product.type || item.product.tipo || productType;
    productPrice = item.product.price || item.product.precio || productPrice;
  }
  // Caso 2: item tiene las propiedades directamente
  else if (item.name || item.nombre) {
    productName = item.name || item.nombre;
    productType = item.type || item.tipo || productType;
    productPrice = item.price || item.precio || productPrice;
  }
  // Caso 3: item es el producto directamente
  else if (item.productName) {
    productName = item.productName;
    productType = item.productType || productType;
    productPrice = item.productPrice || productPrice;
  }
  // Caso 4: item tiene referencia a producto
  else if (item.productId) {
    productName = `Producto ${item.productId}`;
  }
  
  return {
    name: productName,
    type: productType,
    price: productPrice
  };
};

const loadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    if (url.startsWith('data:')) {
      resolve(url);
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        console.error('Error procesando imagen:', error);
        resolve(null);
      }
    };
    img.onerror = (error) => {
      console.error('Error cargando imagen:', error, url);
      resolve(null);
    };
    
    setTimeout(() => {
      if (!img.complete) {
        console.warn('Timeout cargando imagen:', url);
        resolve(null);
      }
    }, 5000);
    
    img.src = url;
  });
};

// Función para cargar la configuración del usuario
const getUserSettings = async (userId) => {
  let logoUrl = null;
  let companyData = null;
  if (userId) {
    try {
      const userSettingsRef = doc(db, 'userSettings', userId);
      const docSnap = await getDoc(userSettingsRef);
      if (docSnap.exists()) {
        const settings = docSnap.data();
        logoUrl = settings.logoUrl || null;
        companyData = settings.companyData || null;
      }
    } catch (error) {
      console.error('Error al cargar la configuración del usuario:', error);
    }
  }
  return { logoUrl, companyData };
};

export const generateQuotePDF = async (quote, client, items, formatCurrency, userId, passedLogoUrl = null, passedCompanyData = null) => {
  try {
    // Validar datos mínimos
    if (!quote) {
      throw new Error('No hay datos de cotización');
    }
    
    if (!client || !client.name) {
      throw new Error('No hay datos del cliente');
    }

    const doc = new jsPDF();
    
    let yPos = 15;
    let logoAdded = false;
    let { logoUrl, companyData } = await getUserSettings(userId);

    logoUrl = passedLogoUrl || logoUrl;
    companyData = passedCompanyData || companyData;

    // Add logo if available
    if (logoUrl) {
      try {
        const logoBase64 = await loadImageAsBase64(url);
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 10, yPos, 25, 25);
          logoAdded = true;
        }
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
      }
    }
    
    // Company info
    let companyYPos = yPos + 3;
    if (companyData && companyData.name) {
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text(companyData.name, logoAdded ? 40 : 20, companyYPos);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      if (companyData.address) {
        companyYPos += 6;
        doc.text(`Dirección: ${companyData.address}`, logoAdded ? 40 : 20, companyYPos);
      }
      if (companyData.phone) {
        companyYPos += 5;
        doc.text(`Teléfono: ${companyData.phone}`, logoAdded ? 40 : 20, companyYPos);
      }
    }
    
    // Header
    yPos = 50;
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('COTIZACIÓN', 105, yPos, { align: 'center' });
    doc.setFont(undefined, 'normal');
    
    doc.setFontSize(10);
    
    // Manejo seguro de fechas CON CORRECCIÓN DE ZONA HORARIA
    const quoteDate = handleDate(quote.createdAt);
    
    doc.text(`Fecha: ${format(quoteDate, 'dd/MM/yyyy', { locale: es })}`, 20, yPos + 12);
    
    // ID de cotización - manejar diferentes nombres de propiedad
    const quoteId = quote.id || quote.quoteId || 'N/A';
    doc.text(`Cotización #: ${quoteId.substring(0, 8).toUpperCase()}`, 20, yPos + 19);
    
    // Client info
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Cliente:', 20, yPos + 32);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    
    doc.text(`Nombre: ${client.name || 'No especificado'}`, 20, yPos + 39);
    doc.text(`Email: ${client.email || 'N/A'}`, 20, yPos + 46);
    doc.text(`Teléfono: ${client.phone || 'N/A'}`, 20, yPos + 53);
    if (client.address) {
      doc.text(`Dirección: ${client.address}`, 20, yPos + 60);
    }
    
    // Items table header
    yPos = yPos + 75;
    
    // Verificar si necesitamos nueva página
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Productos:', 20, yPos);
    doc.setFont(undefined, 'normal');
    
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Producto', 20, yPos);
    doc.text('Tipo', 70, yPos);
    doc.text('Medidas', 100, yPos);
    doc.text('Cant.', 140, yPos);
    doc.text('Precio', 160, yPos);
    doc.text('Total', 180, yPos);
    doc.setFont(undefined, 'normal');
    
    yPos += 8;
    doc.setLineWidth(0.1);
    doc.line(20, yPos, 200, yPos);
    
    yPos += 5;
    
    // Procesar items - VERSIÓN MEJORADA
    if (items && items.length > 0) {
      items.forEach((item, index) => {
        // Verificar si necesitamos nueva página antes de agregar item
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        // Obtener información del producto usando la función mejorada
        const productInfo = getProductInfo(item);
        const itemTotal = calculateItemTotal(item);
        
        // Obtener medidas - manejar diferentes nombres de propiedades
        const length = item.length || item.longitud || 1;
        const width = item.width || item.ancho || 1;
        const quantity = item.quantity || item.cantidad || 1;
        
        const medidas = productInfo.type === 'm2' ? 
          `${length}m x ${width}m` : 
          `${length}m`;
        
        const productName = productInfo.name.substring(0, 30);
        const productType = productInfo.type === 'm2' ? 'm²' : 'ml';
        
        doc.text(productName, 20, yPos);
        doc.text(productType, 70, yPos);
        doc.text(medidas, 100, yPos);
        doc.text(quantity.toString(), 140, yPos);
        doc.text(formatCurrency(productInfo.price), 160, yPos);
        doc.text(formatCurrency(itemTotal), 180, yPos);

        // Observaciones - manejar diferentes nombres de propiedades
        const observations = item.observations || item.observaciones || item.notes;
        if (observations) {
          yPos += 5;
          // Verificar si necesitamos nueva página para observaciones
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFontSize(8);
          doc.setFont(undefined, 'italic');
          doc.text(`Obs: ${observations}`, 20, yPos);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
        }
        
        yPos += 8;
      });
    } else {
      doc.text('No hay productos en esta cotización.', 20, yPos);
      yPos += 10;
    }
    
    // Totals section
    yPos += 10;
    
    // Verificar si necesitamos nueva página para totales
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setLineWidth(0.1);
    doc.line(150, yPos, 200, yPos);
    yPos += 5;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    // Subtotal
    doc.text('SUBTOTAL:', 160, yPos, { align: 'right' });
    doc.text(formatCurrency(quote.total / (quote.includeIVA ? 1.16 : 1)), 200, yPos, { align: 'right' });
    yPos += 6;
    
    // Descuento
    if (quote.discountPercentage && quote.discountPercentage > 0) {
      const discountAmount = (quote.total / (quote.includeIVA ? 1.16 : 1)) * (quote.discountPercentage / 100);
      doc.text(`DESCUENTO (${quote.discountPercentage}%):`, 160, yPos, { align: 'right' });
      doc.text(formatCurrency(-discountAmount), 200, yPos, { align: 'right' });
      yPos += 6;
    }
    
    // IVA
    if (quote.includeIVA) {
      const ivaAmount = quote.total - (quote.total / 1.16);
      doc.text('IVA (16%):', 160, yPos, { align: 'right' });
      doc.text(formatCurrency(ivaAmount), 200, yPos, { align: 'right' });
      yPos += 6;
    }
    
    // Total Final
    yPos += 2;
    doc.setLineWidth(0.5);
    doc.line(150, yPos, 200, yPos);
    yPos += 5;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL:', 160, yPos, { align: 'right' });
    doc.text(formatCurrency(quote.total), 200, yPos, { align: 'right' });
    doc.setFont(undefined, 'normal');
    yPos += 10;
    
    // Payment Method and Advance
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Método de Pago:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(quote.paymentMethod || 'Efectivo', 50, yPos);
    yPos += 6;

    if (quote.advance && quote.advance > 0) {
      doc.setFont(undefined, 'bold');
      doc.text('Anticipo Recibido:', 20, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(formatCurrency(quote.advance), 50, yPos);
      yPos += 6;

      doc.setFont(undefined, 'bold');
      doc.text('Saldo Pendiente:', 20, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(formatCurrency(quote.total - quote.advance), 50, yPos);
      yPos += 6;
    }
    
    // Delivery Date
    if (quote.deliveryDate) {
      const deliveryDate = handleDate(quote.deliveryDate);
      doc.setFont(undefined, 'bold');
      doc.text('Fecha de Entrega:', 20, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(format(deliveryDate, 'dd/MM/yyyy', { locale: es }), 50, yPos);
      yPos += 6;
    }
    
    // Footer
    yPos = 280;
    doc.setFontSize(8);
    doc.text('Gracias por su preferencia.', 105, yPos, { align: 'center' });

    return doc;
  } catch (error) {
    console.error('Error al generar PDF de cotización:', error);
    return null;
  }
};

export const generateSalePDF = async (sale, client, items, formatCurrency, userId, passedLogoUrl = null, passedCompanyData = null) => {
  try {
    // Validar datos mínimos
    if (!sale) {
      throw new Error('No hay datos de venta');
    }
    
    if (!client || !client.name) {
      throw new Error('No hay datos del cliente');
    }

    const doc = new jsPDF();
    
    let yPos = 15;
    let logoAdded = false;
    let { logoUrl, companyData } = await getUserSettings(userId);

    logoUrl = passedLogoUrl || logoUrl;
    companyData = passedCompanyData || companyData;

    // Add logo if available
    if (logoUrl) {
      try {
        const logoBase64 = await loadImageAsBase64(logoUrl);
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 10, yPos, 25, 25);
          logoAdded = true;
        }
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
      }
    }
    
    // Company info
    let companyYPos = yPos + 3;
    if (companyData && companyData.name) {
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text(companyData.name, logoAdded ? 40 : 20, companyYPos);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      if (companyData.address) {
        companyYPos += 6;
        doc.text(`Dirección: ${companyData.address}`, logoAdded ? 40 : 20, companyYPos);
      }
      if (companyData.phone) {
        companyYPos += 5;
        doc.text(`Teléfono: ${companyData.phone}`, logoAdded ? 40 : 20, companyYPos);
      }
    }
    
    // Header
    yPos = 50;
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('TICKET DE VENTA', 105, yPos, { align: 'center' });
    doc.setFont(undefined, 'normal');
    
    doc.setFontSize(10);
    
    // Manejo seguro de fechas CON CORRECCIÓN DE ZONA HORARIA
    const saleDate = handleDate(sale.createdAt);
    
    doc.text(`Fecha: ${format(saleDate, 'dd/MM/yyyy', { locale: es })}`, 20, yPos + 12);
    
    // ID de venta - usar orderNumber
    const orderNumber = sale.orderNumber || sale.id || 'N/A';
    doc.text(`Pedido #: ${orderNumber}`, 20, yPos + 19);
    
    // Client info
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Cliente:', 20, yPos + 32);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    
    doc.text(`Nombre: ${client.name || 'No especificado'}`, 20, yPos + 39);
    doc.text(`Email: ${client.email || 'N/A'}`, 20, yPos + 46);
    doc.text(`Teléfono: ${client.phone || 'N/A'}`, 20, yPos + 53);
    if (client.address) {
      doc.text(`Dirección: ${client.address}`, 20, yPos + 60);
    }
    
    // Items table header
    yPos = yPos + 75;
    
    // Verificar si necesitamos nueva página
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Productos:', 20, yPos);
    doc.setFont(undefined, 'normal');
    
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Producto', 20, yPos);
    doc.text('Tipo', 70, yPos);
    doc.text('Medidas', 100, yPos);
    doc.text('Cant.', 140, yPos);
    doc.text('Precio', 160, yPos);
    doc.text('Total', 180, yPos);
    doc.setFont(undefined, 'normal');
    
    yPos += 8;
    doc.setLineWidth(0.1);
    doc.line(20, yPos, 200, yPos);
    
    yPos += 5;
    
    // Procesar items - VERSIÓN MEJORADA
    if (items && items.length > 0) {
      items.forEach((item, index) => {
        // Verificar si necesitamos nueva página antes de agregar item
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        // Obtener información del producto usando la función mejorada
        const productInfo = getProductInfo(item);
        const itemTotal = calculateItemTotal(item);
        
        // Obtener medidas - manejar diferentes nombres de propiedades
        const length = item.length || item.longitud || 1;
        const width = item.width || item.ancho || 1;
        const quantity = item.quantity || item.cantidad || 1;
        
        const medidas = productInfo.type === 'm2' ? 
          `${length}m x ${width}m` : 
          `${length}m`;
        
        const productName = productInfo.name.substring(0, 30);
        const productType = productInfo.type === 'm2' ? 'm²' : 'ml';
        
        doc.text(productName, 20, yPos);
        doc.text(productType, 70, yPos);
        doc.text(medidas, 100, yPos);
        doc.text(quantity.toString(), 140, yPos);
        doc.text(formatCurrency(productInfo.price), 160, yPos);
        doc.text(formatCurrency(itemTotal), 180, yPos);

        // Observaciones - manejar diferentes nombres de propiedades
        const observations = item.observations || item.observaciones || item.notes;
        if (observations) {
          yPos += 5;
          // Verificar si necesitamos nueva página para observaciones
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFontSize(8);
          doc.setFont(undefined, 'italic');
          doc.text(`Obs: ${observations}`, 20, yPos);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
        }
        
        yPos += 8;
      });
    } else {
      doc.text('No hay productos en esta venta.', 20, yPos);
      yPos += 10;
    }
    
    // Totals section
    yPos += 10;
    
    // Verificar si necesitamos nueva página para totales
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setLineWidth(0.1);
    doc.line(150, yPos, 200, yPos);
    yPos += 5;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    // Subtotal
    doc.text('SUBTOTAL:', 160, yPos, { align: 'right' });
    doc.text(formatCurrency(sale.total / (sale.includeIVA ? 1.16 : 1)), 200, yPos, { align: 'right' });
    yPos += 6;
    
    // Descuento
    if (sale.discountPercentage && sale.discountPercentage > 0) {
      const discountAmount = (sale.total / (sale.includeIVA ? 1.16 : 1)) * (sale.discountPercentage / 100);
      doc.text(`DESCUENTO (${sale.discountPercentage}%):`, 160, yPos, { align: 'right' });
      doc.text(formatCurrency(-discountAmount), 200, yPos, { align: 'right' });
      yPos += 6;
    }
    
    // IVA
    if (sale.includeIVA) {
      const ivaAmount = sale.total - (sale.total / 1.16);
      doc.text('IVA (16%):', 160, yPos, { align: 'right' });
      doc.text(formatCurrency(ivaAmount), 200, yPos, { align: 'right' });
      yPos += 6;
    }
    
    // Total Final
    yPos += 2;
    doc.setLineWidth(0.5);
    doc.line(150, yPos, 200, yPos);
    yPos += 5;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL:', 160, yPos, { align: 'right' });
    doc.text(formatCurrency(sale.total), 200, yPos, { align: 'right' });
    doc.setFont(undefined, 'normal');
    yPos += 10;
    
    // Payment Method and Advance
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Método de Pago:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(sale.paymentMethod || 'Efectivo', 50, yPos);
    yPos += 6;

    // Lógica de visualización de pagos
    if (sale.advance && sale.advance > 0 && sale.advance < sale.total) { // Si hay un anticipo parcial
      doc.setFont(undefined, 'bold');
      doc.text('Anticipo Recibido:', 20, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(formatCurrency(sale.advance), 50, yPos);
      yPos += 6;

      doc.setFont(undefined, 'bold');
      doc.text('Saldo Pendiente:', 20, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(formatCurrency(sale.total - sale.advance), 50, yPos);
      yPos += 6;
    } else if (sale.amountPaid && sale.amountPaid > 0) { // Si se pagó un monto (efectivo o total)
      doc.setFont(undefined, 'bold');
      doc.text('Monto Pagado:', 20, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(formatCurrency(sale.amountPaid), 50, yPos);
      yPos += 6;

      const change = sale.amountPaid - sale.total;
      if (change > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('Cambio:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(formatCurrency(change), 50, yPos);
        yPos += 6;
      }
    }
    
    // Delivery Date
    if (sale.deliveryDate) {
      const deliveryDate = handleDate(sale.deliveryDate);
      doc.setFont(undefined, 'bold');
      doc.text('Fecha de Entrega:', 20, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(format(deliveryDate, 'dd/MM/yyyy', { locale: es }), 50, yPos);
      yPos += 6;
    }
    
    // Footer
    yPos = 280;
    doc.setFontSize(8);
    doc.text('Gracias por su preferencia.', 105, yPos, { align: 'center' });

    return doc;
  } catch (error) {
    console.error('Error al generar PDF de venta:', error);
    return null;
  }
};
