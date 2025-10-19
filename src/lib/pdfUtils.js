import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const loadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const generateQuotePDF = async (quote, client, items, formatCurrency, logoUrl = null, companyData = null) => {
  const doc = new jsPDF();
  
  let yPos = 15;
  let logoAdded = false;
  
  // Add logo if available
  if (logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(logoUrl);
      doc.addImage(logoBase64, 'PNG', 10, yPos, 25, 25);
      logoAdded = true;
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }
  
  // Company info - positioned right after logo
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
  doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy', { locale: es })}`, 20, yPos + 12);
  doc.text(`Cotización #: ${quote.id.substring(0, 8).toUpperCase()}`, 20, yPos + 19);
  
  // Client info
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Cliente:', 20, yPos + 32);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(`Nombre: ${client.name}`, 20, yPos + 39);
  doc.text(`Email: ${client.email}`, 20, yPos + 46);
  doc.text(`Teléfono: ${client.phone}`, 20, yPos + 53);
  if (client.address) {
    doc.text(`Dirección: ${client.address}`, 20, yPos + 60);
  }
  
  // Items table header
  yPos = yPos + 75;
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
  items.forEach((item) => {
    const itemTotal = calculateItemTotal(item);
    const medidas = `${item.length}m x ${item.width}m`;
    
    doc.text(item.product.name.substring(0, 30), 20, yPos);
    doc.text(item.product.type === 'm2' ? 'm²' : 'ml', 70, yPos);
    doc.text(medidas, 100, yPos);
    doc.text(item.quantity.toString(), 140, yPos);
    doc.text(formatCurrency(item.product.price), 160, yPos);
    doc.text(formatCurrency(itemTotal), 180, yPos);
    
    yPos += 8;
  });
  
  yPos += 5;
  doc.setLineWidth(0.1);
  doc.line(20, yPos, 200, yPos);
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Total:', 160, yPos);
  doc.text(formatCurrency(quote.total), 180, yPos);
  
  // Footer
  doc.setFontSize(10);
  doc.setFont(undefined, 'italic');
  doc.text('¡Gracias por su compra!', 105, 280, { align: 'center' });
  
  return doc;
};

export const generateSalePDF = async (sale, client, items, formatCurrency, logoUrl = null, companyData = null) => {
  const doc = new jsPDF();
  
  let yPos = 15;
  let logoAdded = false;
  
  // Add logo if available
  if (logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(logoUrl);
      doc.addImage(logoBase64, 'PNG', 10, yPos, 25, 25);
      logoAdded = true;
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }
  
  // Company info - positioned right after logo
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
  doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy', { locale: es })}`, 20, yPos + 12);
  doc.text(`Pedido #: ${sale.orderNumber}`, 20, yPos + 19);
  
  // Client info
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Cliente:', 20, yPos + 32);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(`Nombre: ${client.name}`, 20, yPos + 39);
  doc.text(`Email: ${client.email}`, 20, yPos + 46);
  doc.text(`Teléfono: ${client.phone}`, 20, yPos + 53);
  
  // Delivery date
  if (sale.deliveryDate) {
    doc.text(`Fecha de entrega: ${format(new Date(sale.deliveryDate), 'dd/MM/yyyy', { locale: es })}`, 20, yPos + 60);
  }
  
  // Items table header
  yPos = yPos + 75;
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
  items.forEach((item) => {
    const itemTotal = calculateItemTotal(item);
    const medidas = `${item.length}m x ${item.width}m`;
    
    doc.text(item.product.name.substring(0, 30), 20, yPos);
    doc.text(item.product.type === 'm2' ? 'm²' : 'ml', 70, yPos);
    doc.text(medidas, 100, yPos);
    doc.text(item.quantity.toString(), 140, yPos);
    doc.text(formatCurrency(item.product.price), 160, yPos);
    doc.text(formatCurrency(itemTotal), 180, yPos);
    
    yPos += 8;
  });
  
  yPos += 5;
  doc.setLineWidth(0.1);
  doc.line(20, yPos, 200, yPos);
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Total:', 160, yPos);
  doc.text(formatCurrency(sale.total), 180, yPos);
  
  // Payment info
  yPos += 15;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Información de Pago:', 20, yPos);
  doc.setFont(undefined, 'normal');
  
  yPos += 7;
  const paymentLabels = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    credit: 'Fiado'
  };
  doc.text(`Método: ${paymentLabels[sale.paymentMethod] || sale.paymentMethod}`, 20, yPos);
  
  if (sale.paymentMethod === 'cash') {
    yPos += 7;
    doc.text(`Monto Pagado: ${formatCurrency(sale.amountPaid || 0)}`, 20, yPos);
    yPos += 7;
    doc.text(`Cambio: ${formatCurrency(sale.change || 0)}`, 20, yPos);
  } else if (sale.paymentMethod === 'credit') {
    yPos += 7;
    doc.text(`Anticipo: ${formatCurrency(sale.advance || 0)}`, 20, yPos);
    yPos += 7;
    doc.text(`Saldo Pendiente: ${formatCurrency((sale.total || 0) - (sale.advance || 0))}`, 20, yPos);
  }
  
  // Footer
  doc.setFontSize(10);
  doc.setFont(undefined, 'italic');
  doc.text('¡Gracias por su compra!', 105, 280, { align: 'center' });
  
  return doc;
};

export const calculateItemTotal = (item) => {
  const basePrice = item.product.price || 0;
  
  if (item.product.type === 'm2') {
    return basePrice * item.length * item.width * item.quantity;
  } else {
    return basePrice * item.length * item.quantity;
  }
};

