import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { Save, Upload, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const Settings = () => {
  const { language, setLanguage, currency, setCurrency } = useSettings();
  const { currentUser } = useAuth();
  
  const [companyData, setCompanyData] = useState({
    name: '',
    address: '',
    phone: ''
  });
  
  const [bankData, setBankData] = useState({
    bank: 'Banco XYZ',
    accountNumber: '1234567890',
    accountHolder: 'Empresa XYZ'
  });
  
  const [logo, setLogo] = useState(null);
  const [logoUrl, setLogoUrl] = useState(() => {
    return localStorage.getItem('logoUrl') || null;
  });
  const [logoPreview, setLogoPreview] = useState(logoUrl);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  useEffect(() => {
    const savedBankData = localStorage.getItem('bankData');
    if (savedBankData) {
      setBankData(JSON.parse(savedBankData));
    }
    
    const savedCompanyData = localStorage.getItem('companyData');
    if (savedCompanyData) {
      setCompanyData(JSON.parse(savedCompanyData));
    }
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = async () => {
    if (!logo) {
      alert('Selecciona una imagen de logo');
      return;
    }

    try {
      const storageRef = ref(storage, `logos/${currentUser.uid}/logo`);
      await uploadBytes(storageRef, logo);
      const url = await getDownloadURL(storageRef);
      setLogoUrl(url);
      localStorage.setItem('logoUrl', url);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setLogo(null);
    } catch (error) {
      console.error('Error al guardar logo:', error);
      alert('Error al guardar el logo');
    }
  };

  const handleDeleteLogo = () => {
    setLogoUrl(null);
    setLogoPreview(null);
    localStorage.removeItem('logoUrl');
  };

  const handleSaveCompanyData = () => {
    localStorage.setItem('companyData', JSON.stringify(companyData));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveBankData = () => {
    localStorage.setItem('bankData', JSON.stringify(bankData));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCompanyDataChange = (field, value) => {
    setCompanyData({
      ...companyData,
      [field]: value
    });
  };

  const handleBankDataChange = (field, value) => {
    setBankData({
      ...bankData,
      [field]: value
    });
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportLoading(true);
      setImportMessage('');

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            setImportMessage('El archivo está vacío');
            setImportLoading(false);
            return;
          }

          const firstRow = jsonData[0];
          const isClients = firstRow.hasOwnProperty('Nombre') && firstRow.hasOwnProperty('Email');
          const isProducts = firstRow.hasOwnProperty('Nombre del Producto') || firstRow.hasOwnProperty('Tipo');

          let importedCount = 0;

          for (const row of jsonData) {
            try {
              if (isClients) {
                await addDoc(collection(db, 'clients'), {
                  name: row.Nombre || row.name || '',
                  email: row.Email || row.email || '',
                  phone: row.Teléfono || row.phone || '',
                  address: row.Dirección || row.address || '',
                  userId: currentUser.uid,
                  createdAt: new Date()
                });
              } else if (isProducts) {
                await addDoc(collection(db, 'products'), {
                  name: row['Nombre del Producto'] || row.Nombre || row.name || '',
                  description: row.Descripción || row.description || '',
                  type: row.Tipo || row.type || 'm2',
                  price: parseFloat(row.Precio || row.price || 0),
                  userId: currentUser.uid,
                  createdAt: new Date()
                });
              }
              importedCount++;
            } catch (error) {
              console.error('Error importando fila:', error);
            }
          }

          setImportMessage(`✓ Se importaron ${importedCount} ${isClients ? 'clientes' : 'productos'} exitosamente`);
          e.target.value = '';
        } catch (error) {
          console.error('Error al procesar Excel:', error);
          setImportMessage('Error al procesar el archivo');
        }
        setImportLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error al importar:', error);
      setImportMessage('Error al importar datos');
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Personaliza tu experiencia en la aplicación
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={currentUser?.email || ''}
              disabled
            />
          </div>
          <div>
            <Label>Nombre</Label>
            <Input
              type="text"
              value={currentUser?.displayName || ''}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Estos datos aparecerán en los PDFs de cotizaciones y ventas
          </p>
          <div>
            <Label htmlFor="company-name">Nombre de la Empresa</Label>
            <Input
              id="company-name"
              value={companyData.name}
              onChange={(e) => handleCompanyDataChange('name', e.target.value)}
              placeholder="Ej: Mi Empresa S.A."
            />
          </div>
          <div>
            <Label htmlFor="company-address">Dirección</Label>
            <Input
              id="company-address"
              value={companyData.address}
              onChange={(e) => handleCompanyDataChange('address', e.target.value)}
              placeholder="Ej: Calle Principal 123, Ciudad"
            />
          </div>
          <div>
            <Label htmlFor="company-phone">Teléfono</Label>
            <Input
              id="company-phone"
              value={companyData.phone}
              onChange={(e) => handleCompanyDataChange('phone', e.target.value)}
              placeholder="Ej: +1 (555) 123-4567"
            />
          </div>
          <Button onClick={handleSaveCompanyData}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Datos de Empresa
          </Button>
          {saveSuccess && (
            <div className="p-3 bg-green-100 text-green-800 rounded-md text-sm">
              ✓ Cambios guardados exitosamente
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo de la Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sube un logo que aparecerá en los PDFs de cotizaciones y ventas
          </p>
          
          {logoPreview && (
            <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
              <img src={logoPreview} alt="Logo preview" className="h-20" />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteLogo}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          )}
          
          <div>
            <Label htmlFor="logo-upload">Seleccionar imagen</Label>
            <Input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
            />
          </div>
          
          {logo && (
            <Button onClick={handleSaveLogo}>
              <Upload className="h-4 w-4 mr-2" />
              Guardar Logo
            </Button>
          )}
          
          {logoUrl && !logo && (
            <div className="p-3 bg-green-100 text-green-800 rounded-md text-sm">
              ✓ Logo guardado exitosamente
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferencias de Idioma y Moneda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="language">Idioma</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="currency">Moneda</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MXN">Pesos Mexicanos (MXN)</SelectItem>
                <SelectItem value="USD">Dólares Estadounidenses (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos Bancarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Estos datos se mostrarán cuando los clientes seleccionen "Transferencia" como método de pago
          </p>
          <div>
            <Label htmlFor="bank">Banco</Label>
            <Input
              id="bank"
              value={bankData.bank}
              onChange={(e) => handleBankDataChange('bank', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="account-number">Número de Cuenta</Label>
            <Input
              id="account-number"
              value={bankData.accountNumber}
              onChange={(e) => handleBankDataChange('accountNumber', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="account-holder">Titular de la Cuenta</Label>
            <Input
              id="account-holder"
              value={bankData.accountHolder}
              onChange={(e) => handleBankDataChange('accountHolder', e.target.value)}
            />
          </div>
          <Button onClick={handleSaveBankData}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Importar Datos desde Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Carga un archivo Excel con clientes o productos. El archivo debe tener las siguientes columnas:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
            <p><strong>Para Clientes:</strong> Nombre, Email, Teléfono, Dirección</p>
            <p><strong>Para Productos:</strong> Nombre del Producto, Descripción, Tipo (m2 o linear), Precio</p>
          </div>
          
          <div>
            <Label htmlFor="import-file">Seleccionar archivo Excel</Label>
            <Input
              id="import-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelImport}
              disabled={importLoading}
            />
          </div>
          
          {importMessage && (
            <div className={`p-3 rounded-md text-sm ${
              importMessage.startsWith('✓') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {importMessage}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Aplicación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm font-semibold">Versión</p>
            <p className="text-sm text-muted-foreground">1.0.0</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Última actualización</p>
            <p className="text-sm text-muted-foreground">Octubre 2025</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Desarrollado por</p>
            <p className="text-sm text-muted-foreground">Manus AI</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;

