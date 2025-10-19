# Aplicación Web de Gestión de Ventas y Cotizaciones

Una aplicación web moderna y completa para la gestión de ventas, cotizaciones, clientes y productos, diseñada específicamente para empresas del sector de vidrios, aluminio y carpintería.

## 🚀 Características Principales

### Funcionalidades Implementadas

- **Autenticación**: Inicio de sesión con Google y Apple mediante Firebase Authentication
- **Gestión de Clientes**: CRUD completo para administrar la base de clientes
- **Gestión de Productos**: Administración de productos con soporte para metro cuadrado (m²) y metro lineal
- **Cotizaciones**: 
  - Creación de cotizaciones con múltiples productos
  - Cálculos automáticos según el tipo de producto
  - Generación de PDF
  - Compartir por Email y WhatsApp
  - Historial de cotizaciones
  - Conversión de cotización a venta
- **Interfaz Moderna**: Diseño responsivo con Tailwind CSS y componentes de shadcn/ui
- **Multi-moneda**: Soporte para MXN y USD
- **Multi-idioma**: Preparado para español e inglés

### Funcionalidades Planificadas

- Gestión completa de ventas con métodos de pago (efectivo, transferencia, fiado)
- Gestión de pedidos con números de seguimiento
- Análisis de ventas con gráficos y exportación a Excel
- Importación/exportación de datos desde Excel
- Configuración avanzada de usuario

## 📋 Requisitos Previos

- Node.js 18+ instalado
- Una cuenta de Firebase
- pnpm (recomendado) o npm

## 🔧 Configuración de Firebase

### 1. Crear un Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Sigue los pasos para crear tu proyecto

### 2. Habilitar Autenticación

1. En la consola de Firebase, ve a **Authentication**
2. Haz clic en **Comenzar**
3. Habilita los siguientes proveedores:
   - **Google**: Haz clic en Google, actívalo y guarda
   - **Apple**: Haz clic en Apple, actívalo y configura según las instrucciones

### 3. Crear Firestore Database

1. Ve a **Firestore Database**
2. Haz clic en **Crear base de datos**
3. Selecciona **Modo de prueba** (para desarrollo)
4. Elige una ubicación cercana a tus usuarios

### 4. Configurar Storage

1. Ve a **Storage**
2. Haz clic en **Comenzar**
3. Acepta las reglas de seguridad predeterminadas

### 5. Obtener Credenciales

1. Ve a **Configuración del proyecto** (ícono de engranaje)
2. En la sección "Tus aplicaciones", haz clic en el ícono web `</>`
3. Registra tu aplicación
4. Copia las credenciales de configuración

### 6. Configurar la Aplicación

Edita el archivo `src/lib/firebase.js` y reemplaza las credenciales:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 7. Configurar Reglas de Seguridad

#### Firestore Rules

Ve a Firestore Database > Reglas y reemplaza con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura/escritura solo a usuarios autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Storage Rules

Ve a Storage > Reglas y reemplaza con:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /pdfs/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 🛠️ Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias**

```bash
cd sales-quotes-app
pnpm install
```

3. **Configurar Firebase** (ver sección anterior)

4. **Iniciar el servidor de desarrollo**

```bash
pnpm run dev
```

5. **Abrir en el navegador**

Visita `http://localhost:5173`

## 📦 Estructura del Proyecto

```
sales-quotes-app/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes UI de shadcn/ui
│   │   └── Navigation.jsx   # Navegación principal
│   ├── contexts/
│   │   ├── AuthContext.jsx      # Contexto de autenticación
│   │   └── SettingsContext.jsx  # Contexto de configuración
│   ├── lib/
│   │   ├── firebase.js      # Configuración de Firebase
│   │   ├── pdfUtils.js      # Utilidades para generar PDFs
│   │   ├── shareUtils.js    # Utilidades para compartir
│   │   └── utils.js         # Utilidades generales
│   ├── pages/
│   │   ├── Login.jsx        # Página de inicio de sesión
│   │   ├── Home.jsx         # Página de inicio
│   │   ├── Clients.jsx      # Gestión de clientes
│   │   ├── Products.jsx     # Gestión de productos
│   │   ├── Quotes.jsx       # Lista de cotizaciones
│   │   └── QuoteForm.jsx    # Formulario de cotización
│   ├── App.jsx              # Componente principal
│   ├── App.css              # Estilos globales
│   └── main.jsx             # Punto de entrada
├── public/                  # Archivos estáticos
├── package.json
└── README.md
```

## 🎨 Tecnologías Utilizadas

- **React 19**: Framework de UI
- **React Router**: Navegación
- **Firebase**: Backend (Auth, Firestore, Storage)
- **Tailwind CSS**: Estilos
- **shadcn/ui**: Componentes UI
- **Lucide Icons**: Iconos
- **jsPDF**: Generación de PDFs
- **date-fns**: Manejo de fechas
- **xlsx**: Exportación/importación de Excel
- **Vite**: Build tool

## 📱 Funcionalidades de Compartir

### Generación de PDF

La aplicación genera PDFs profesionales para cotizaciones y ventas utilizando jsPDF. Los PDFs incluyen:

- Información del cliente
- Detalles de productos con cálculos
- Totales
- Fecha y número de referencia

### Compartir por Email

Al seleccionar "Email", se abre el cliente de correo predeterminado con:

- Asunto predefinido
- Mensaje personalizado
- Enlace al PDF alojado en Firebase Storage

### Compartir por WhatsApp

Al seleccionar "WhatsApp", se abre WhatsApp Web/App con:

- Mensaje predefinido
- Enlace al PDF
- Opción de especificar número de teléfono

### Descarga Directa

Los usuarios pueden descargar los PDFs directamente a su dispositivo.

## 🧮 Cálculos Automáticos

### Metro Cuadrado (m²)

```
Total = Largo × Ancho × Precio × Cantidad
```

### Metro Lineal

```
Total = (Largo + Ancho) × 2 × Precio × Cantidad
```

## 🔐 Seguridad

- Autenticación obligatoria para acceder a la aplicación
- Reglas de seguridad de Firestore configuradas
- Datos de usuario aislados
- PDFs almacenados de forma segura en Firebase Storage

## 🚀 Despliegue

### Opción 1: Firebase Hosting

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Iniciar sesión
firebase login

# Inicializar proyecto
firebase init hosting

# Construir aplicación
pnpm run build

# Desplegar
firebase deploy
```

### Opción 2: Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Despliega automáticamente

### Opción 3: Netlify

1. Conecta tu repositorio a Netlify
2. Configura el comando de build: `pnpm run build`
3. Directorio de publicación: `dist`
4. Despliega

## 📝 Notas Importantes

1. **Configuración de Firebase**: Es esencial configurar correctamente Firebase antes de usar la aplicación
2. **Reglas de Seguridad**: Las reglas de prueba son solo para desarrollo. En producción, implementa reglas más estrictas
3. **Costos**: Firebase tiene un plan gratuito generoso, pero revisa los límites según tu uso
4. **Autenticación con Apple**: Requiere una cuenta de desarrollador de Apple

## 🐛 Solución de Problemas

### Error de autenticación

- Verifica que los proveedores estén habilitados en Firebase Console
- Revisa que el dominio esté autorizado en Firebase Authentication > Settings

### Error al guardar datos

- Verifica las reglas de Firestore
- Asegúrate de estar autenticado

### PDFs no se generan

- Verifica la consola del navegador para errores
- Asegúrate de que Firebase Storage esté configurado

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request para sugerencias o mejoras.

## 📧 Soporte

Para soporte o preguntas, contacta al equipo de desarrollo.

---

**Desarrollado con ❤️ para empresas de vidrios, aluminio y carpintería**

