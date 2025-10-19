import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

// Upload PDF to Firebase Storage and get public URL
export const uploadPDFToStorage = async (pdfBlob, filename) => {
  try {
    const storageRef = ref(storage, `pdfs/${filename}`);
    await uploadBytes(storageRef, pdfBlob);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
};

// Share via Email
export const shareViaEmail = (pdfURL, subject, body, recipientEmail = '') => {
  const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    `${body}\n\nPuedes descargar el documento aquí: ${pdfURL}`
  )}`;
  
  window.location.href = mailtoLink;
};

// Share via WhatsApp
export const shareViaWhatsApp = (pdfURL, message, phoneNumber = '') => {
  const text = `${message}\n\nPuedes descargar el documento aquí: ${pdfURL}`;
  
  let whatsappURL;
  if (phoneNumber) {
    // Remove non-numeric characters from phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    whatsappURL = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  } else {
    whatsappURL = `https://wa.me/?text=${encodeURIComponent(text)}`;
  }
  
  window.open(whatsappURL, '_blank');
};

// Download PDF directly
export const downloadPDF = (doc, filename) => {
  doc.save(filename);
};

// Share PDF with multiple options
export const sharePDF = async (doc, filename, options = {}) => {
  const {
    method = 'download', // 'download', 'email', 'whatsapp'
    email = '',
    phone = '',
    subject = '',
    message = ''
  } = options;
  
  if (method === 'download') {
    downloadPDF(doc, filename);
    return;
  }
  
  // For email and WhatsApp, we need to upload to Firebase Storage first
  const pdfBlob = doc.output('blob');
  const pdfURL = await uploadPDFToStorage(pdfBlob, filename);
  
  if (method === 'email') {
    shareViaEmail(pdfURL, subject, message, email);
  } else if (method === 'whatsapp') {
    shareViaWhatsApp(pdfURL, message, phone);
  }
  
  return pdfURL;
};

