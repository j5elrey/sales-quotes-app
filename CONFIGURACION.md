# Guía de Configuración Rápida

Esta guía te ayudará a configurar la aplicación en pocos pasos.

## Paso 1: Crear Proyecto en Firebase

1. Ve a https://console.firebase.google.com/
2. Haz clic en "Agregar proyecto"
3. Nombra tu proyecto (ej: "ventas-cotizaciones")
4. Desactiva Google Analytics si no lo necesitas
5. Haz clic en "Crear proyecto"

## Paso 2: Configurar Autenticación

1. En el menú lateral, haz clic en **"Authentication"**
2. Haz clic en **"Comenzar"**
3. Habilita **Google**:
   - Haz clic en "Google"
   - Activa el interruptor
   - Selecciona un email de soporte
   - Haz clic en "Guardar"
4. Habilita **Apple** (opcional):
   - Haz clic en "Apple"
   - Activa el interruptor
   - Completa la configuración requerida
   - Haz clic en "Guardar"

## Paso 3: Crear Base de Datos Firestore

1. En el menú lateral, haz clic en **"Firestore Database"**
2. Haz clic en **"Crear base de datos"**
3. Selecciona **"Comenzar en modo de prueba"**
4. Elige la ubicación más cercana a tus usuarios
5. Haz clic en "Habilitar"

## Paso 4: Configurar Storage

1. En el menú lateral, haz clic en **"Storage"**
2. Haz clic en **"Comenzar"**
3. Acepta las reglas de seguridad predeterminadas
4. Elige la misma ubicación que Firestore
5. Haz clic en "Listo"

## Paso 5: Obtener Credenciales de Firebase

1. Haz clic en el ícono de **engranaje** (⚙️) junto a "Descripción general del proyecto"
2. Selecciona **"Configuración del proyecto"**
3. Baja hasta la sección **"Tus aplicaciones"**
4. Haz clic en el ícono **web** (`</>`)
5. Registra tu aplicación:
   - Nombre: "Gestión de Ventas"
   - No es necesario configurar Firebase Hosting
   - Haz clic en "Registrar app"
6. **Copia el código de configuración** que se muestra

## Paso 6: Configurar la Aplicación

1. Abre el archivo `src/lib/firebase.js` en tu editor de código
2. Reemplaza las credenciales con las que copiaste:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",                    // Pega tu apiKey
  authDomain: "tu-proyecto.firebaseapp.com",  // Pega tu authDomain
  projectId: "tu-proyecto",             // Pega tu projectId
  storageBucket: "tu-proyecto.appspot.com",   // Pega tu storageBucket
  messagingSenderId: "123456789",       // Pega tu messagingSenderId
  appId: "1:123456789:web:abc123"       // Pega tu appId
};
```

3. Guarda el archivo

## Paso 7: Configurar Reglas de Seguridad

### Reglas de Firestore

1. Ve a **Firestore Database** > **Reglas**
2. Reemplaza el contenido con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Haz clic en **"Publicar"**

### Reglas de Storage

1. Ve a **Storage** > **Reglas**
2. Reemplaza el contenido con:

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

3. Haz clic en **"Publicar"**

## Paso 8: Instalar y Ejecutar

1. Abre una terminal en la carpeta del proyecto
2. Instala las dependencias:

```bash
pnpm install
```

3. Inicia el servidor de desarrollo:

```bash
pnpm run dev
```

4. Abre tu navegador en `http://localhost:5173`

## ✅ Verificación

Si todo está configurado correctamente:

1. Deberías ver la pantalla de inicio de sesión
2. Podrás iniciar sesión con Google
3. Después de iniciar sesión, verás el panel principal
4. Podrás crear clientes, productos y cotizaciones

## ⚠️ Problemas Comunes

### Error: "Firebase: Error (auth/unauthorized-domain)"

**Solución:**
1. Ve a Firebase Console > Authentication > Settings
2. En "Dominios autorizados", agrega `localhost`

### Error al guardar datos

**Solución:**
1. Verifica que las reglas de Firestore estén publicadas
2. Asegúrate de estar autenticado

### No se pueden generar PDFs

**Solución:**
1. Verifica que Storage esté configurado
2. Revisa las reglas de Storage

## 🎉 ¡Listo!

Tu aplicación está configurada y lista para usar. Puedes comenzar a:

- Agregar clientes
- Crear productos
- Generar cotizaciones
- Compartir por email o WhatsApp

## 📚 Próximos Pasos

- Lee el archivo README.md para más detalles
- Personaliza los estilos según tu marca
- Configura el despliegue en producción
- Implementa las funcionalidades adicionales de ventas y análisis

---

¿Necesitas ayuda? Revisa la documentación completa en README.md

