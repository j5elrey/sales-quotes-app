# Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar tu aplicación de Gestión de Ventas y Cotizaciones en Vercel de forma rápida y sencilla.

## Requisitos Previos

1. **Cuenta de GitHub**: Necesitarás una cuenta en [github.com](https://github.com)
2. **Cuenta de Vercel**: Crea una cuenta gratuita en [vercel.com](https://vercel.com)
3. **Git instalado**: Descarga desde [git-scm.com](https://git-scm.com)

## Paso 1: Preparar tu Repositorio en GitHub

### 1.1 Crear un repositorio en GitHub

1. Ve a [github.com](https://github.com) y inicia sesión
2. Haz clic en el icono `+` en la esquina superior derecha
3. Selecciona "New repository"
4. Nombre del repositorio: `sales-quotes-app`
5. Descripción: "Aplicación de Gestión de Ventas y Cotizaciones"
6. Selecciona "Public" o "Private" según tu preferencia
7. Haz clic en "Create repository"

### 1.2 Inicializar Git en tu proyecto local

```bash
cd /ruta/a/tu/sales-quotes-app
git init
git add .
git commit -m "Commit inicial: Aplicación de gestión de ventas y cotizaciones"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/sales-quotes-app.git
git push -u origin main
```

Reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub.

## Paso 2: Conectar Vercel a tu Repositorio

### 2.1 Crear proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión (puedes usar tu cuenta de GitHub)
2. Haz clic en "New Project"
3. Haz clic en "Import Git Repository"
4. Busca y selecciona `sales-quotes-app`
5. Haz clic en "Import"

### 2.2 Configurar Variables de Entorno

En la página de configuración del proyecto en Vercel:

1. Ve a la sección "Environment Variables"
2. Agrega las siguientes variables (obtén los valores de tu proyecto Firebase):

```
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

**Cómo obtener tus credenciales de Firebase:**

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a "Project Settings" (ícono de engranaje)
4. En la pestaña "General", desplázate hacia abajo
5. Copia el objeto de configuración de tu aplicación web
6. Extrae los valores necesarios

### 2.3 Configurar Firebase para Vercel

**Importante:** Debes autorizar el dominio de Vercel en Firebase:

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a "Authentication" > "Settings"
4. En "Authorized domains", agrega tu dominio de Vercel:
   - Formato: `tu-proyecto.vercel.app`
   - También agrega: `localhost:3000` para desarrollo local

## Paso 3: Desplegar

### 3.1 Despliegue Automático

Una vez que hayas completado los pasos anteriores:

1. Vercel detectará automáticamente tu `vercel.json`
2. Haz clic en "Deploy"
3. Vercel construirá y desplegará tu aplicación automáticamente
4. Una vez completado, recibirás una URL como: `https://sales-quotes-app-xxx.vercel.app`

### 3.2 Despliegues Futuros

Cada vez que hagas un `push` a tu rama `main` en GitHub, Vercel desplegará automáticamente los cambios.

```bash
git add .
git commit -m "Descripción de los cambios"
git push origin main
```

## Paso 4: Verificar tu Aplicación

1. Accede a tu URL de Vercel
2. Prueba todas las funcionalidades:
   - ✅ Login con Google/Apple
   - ✅ Crear clientes y productos
   - ✅ Generar cotizaciones y ventas
   - ✅ Descargar PDFs
   - ✅ Compartir por email/WhatsApp

## Solución de Problemas

### Error: "Firebase initialization failed"

**Solución:** Verifica que las variables de entorno estén correctamente configuradas en Vercel.

### Error: "CORS error"

**Solución:** Asegúrate de que tu dominio de Vercel esté autorizado en Firebase Authentication.

### Error: "Build failed"

**Solución:** 
1. Verifica que `pnpm` esté instalado
2. Revisa los logs de construcción en Vercel
3. Asegúrate de que no hay errores de sintaxis

### La aplicación carga pero no funciona

**Solución:** Abre la consola del navegador (F12) y busca errores. Probablemente sea un problema con las variables de entorno.

## Dominio Personalizado (Opcional)

Si deseas usar un dominio personalizado:

1. En Vercel, ve a "Settings" > "Domains"
2. Agrega tu dominio personalizado
3. Sigue las instrucciones para actualizar los registros DNS
4. Actualiza los dominios autorizados en Firebase

## Soporte

Si encuentras problemas:

1. Revisa los logs en Vercel: "Deployments" > "Logs"
2. Consulta la documentación de Vercel: [vercel.com/docs](https://vercel.com/docs)
3. Revisa la documentación de Firebase: [firebase.google.com/docs](https://firebase.google.com/docs)

¡Tu aplicación está lista para el mundo! 🚀

