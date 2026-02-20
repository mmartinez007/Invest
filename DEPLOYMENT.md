# 🚀 Guía de Despliegue GRATIS — CryptoVault

**Stack**: Vercel (Frontend) + Google Cloud Run (Backend) + MongoDB Atlas (BD)

---

## Parte 1: Base de Datos — MongoDB Atlas (Gratis 512 MB)

> [!IMPORTANT]
> Cloud Run no guarda archivos entre reinicios, por eso usamos MongoDB en la nube en vez de SQLite.

1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) → Crear cuenta gratis.
2. Crea un **Cluster** → Elige **M0 Sandbox** (GRATIS).
3. **Security → Network Access** → Añade `0.0.0.0/0` (necesario para Cloud Run).
4. **Security → Database Access** → Crea un usuario + contraseña (**¡anótalos!**).
5. **Deployment → Database → Connect → Drivers → Node.js** → Copia el Connection String:
   ```
   mongodb+srv://<usuario>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   *(Reemplaza `<password>` por tu contraseña real)*

---

## Parte 2: Backend — Google Cloud Run (Gratis ~2M peticiones/mes)

### Paso 1: Instalar Google Cloud CLI

Descarga e instala desde: https://cloud.google.com/sdk/docs/install

### Paso 2: Crear proyecto en Google Cloud

1. Ve a https://console.cloud.google.com
2. Crea un **proyecto nuevo** (ej: `cryptovault-app`)
3. Anota el **Project ID**

### Paso 3: Desplegar

Abre la terminal **en la carpeta `server/`** y ejecuta:

```bash
# 1. Login
gcloud auth login

# 2. Configurar proyecto
gcloud config set project TU_PROJECT_ID

# 3. Desplegar (construye y sube automáticamente)
gcloud run deploy cryptovault-api --source .
```

Te preguntará:
- **Region**: Elige `europe-west1` (más cercano a España)
- **Allow unauthenticated invocations**: Escribe **y**

### Paso 4: Configurar la variable de MongoDB

1. Ve a [Cloud Run Console](https://console.cloud.google.com/run)
2. Click en tu servicio `cryptovault-api`
3. **Editar e Implementar Nueva Revisión**
4. Pestaña **Variables y Secretos** → Añadir variable:
   - Nombre: `MONGODB_URI`
   - Valor: *tu Connection String de Atlas*
5. Click **Implementar**

✅ **Copia la URL** que te da (ej: `https://cryptovault-api-xxxxx-ew.a.run.app`)

---

## Parte 3: Frontend — Vercel (Gratis, ilimitado)

### Paso 1: Preparar variable de entorno

Crea el archivo `.env.production` en la **raíz** del proyecto (`Investing Tracker/`):

```env
VITE_API_URL=https://cryptovault-api-xxxxx-ew.a.run.app
```

*(Usa la URL real de Cloud Run del paso anterior)*

### Paso 2: Subir a GitHub (si no lo tienes ya)

Vercel se conecta a GitHub. Si no tienes el repo:

```bash
# Desde la raíz del proyecto (Investing Tracker/)
git init
git add .
git commit -m "Initial commit"

# Crea un repo en github.com, luego:
git remote add origin https://github.com/TU_USUARIO/cryptovault.git
git branch -M main
git push -u origin main
```

### Paso 3: Desplegar en Vercel

1. Ve a [Vercel](https://vercel.com) → Crear cuenta gratis (con GitHub).
2. Click **"Add New Project"** → Importa tu repositorio de GitHub.
3. Vercel detectará Vite automáticamente. Configuración:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (déjalo por defecto)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. En **Environment Variables**, añade:
   - `VITE_API_URL` = `https://cryptovault-api-xxxxx-ew.a.run.app`
5. Click **Deploy** 🚀

✅ Vercel te dará tu URL (ej: `https://cryptovault-xxxx.vercel.app`)

### Paso 4 (Opcional): Dominio personalizado

En Vercel → Settings → Domains, puedes añadir tu propio dominio gratis.

---

## Paso Final: Configurar CORS en el Backend

El backend necesita aceptar peticiones desde tu dominio de Vercel. Edita `server/server.js`:

```javascript
// Cambia esto:
app.use(cors());

// Por esto (con tu dominio real):
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://cryptovault-xxxx.vercel.app'  // Tu URL de Vercel
  ]
}));
```

Después vuelve a desplegar el backend:
```bash
# Desde la carpeta server/
gcloud run deploy cryptovault-api --source .
```

---

## ✅ Resumen Final

| Componente | Plataforma | URL |
|---|---|---|
| **Base de datos** | MongoDB Atlas | (Connection String interno) |
| **Backend API** | Google Cloud Run | `https://cryptovault-api-xxxxx.a.run.app` |
| **Frontend** | Vercel | `https://cryptovault-xxxx.vercel.app` |

### Costes: $0/mes 🎉
- **Atlas M0**: Gratis 512MB
- **Cloud Run Free Tier**: 2M peticiones/mes gratis
- **Vercel Hobby**: Ilimitado para proyectos personales

### Futuras actualizaciones
- **Frontend**: Haz `git push` → Vercel redespliega automáticamente
- **Backend**: Desde `server/`, ejecuta `gcloud run deploy cryptovault-api --source .`
