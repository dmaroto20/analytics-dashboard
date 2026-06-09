# Analytics Dashboard

Dashboard web para revisar datos de Google Analytics 4 usando un backend en Node.js y la Google Analytics Data API.

## Link recomendado

Para compartirlo con jefatura, lo recomendado es que el backend use una cuenta de servicio de Google. Asi cada persona entra con el PIN del dashboard, pero no tiene que autorizar Google ni tener acceso directo a la cuenta de Analytics.

URL esperada del proyecto:

```text
https://analytics-dashboard-7teo.onrender.com/
```

## Variables de entorno

Crea estas variables en Render:

```text
PROPERTY_ID=414258625
CORS_ORIGIN=https://analytics-dashboard-7teo.onrender.com
SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

Luego agrega el correo de la cuenta de servicio como usuario de la propiedad GA4 con permiso de Viewer o Analyst.

## OAuth opcional

El proyecto conserva el flujo OAuth como respaldo. Si Google Analytics no acepta la cuenta de servicio, usa un refresh token persistente. Esta es la opcion mas practica para compartir el dashboard: autorizas una vez con tu cuenta y Render renueva el acceso automaticamente.

En ese caso, crea estas variables en Render:

```text
OAUTH_CLIENT_ID=your-google-oauth-client-id
OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
REDIRECT_URI=https://analytics-dashboard-7teo.onrender.com/auth/callback
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
```

Con `GOOGLE_REFRESH_TOKEN` configurado, los usuarios del dashboard no tienen que iniciar sesion con Google.

## Desarrollo local

```bash
npm install
npm start
```

Luego abre:

```text
http://localhost:3000/
```

## Notas de seguridad

El PIN del dashboard esta en el HTML, por lo que sirve como una barrera simple de interfaz, no como seguridad real. Para proteger el dashboard de forma fuerte, conviene mover ese control al backend o activar autenticacion del proveedor de hosting.

## Documentacion operativa

La configuracion real de Render, Google OAuth, Analytics y el archivo que se sube a la web esta documentada en:

```text
DEPLOYMENT.md
```

La vision del portal futuro de inteligencia digital, incluyendo Search Console, keywords, Adwords y competencia, esta documentada en:

```text
DIGITAL_INTELLIGENCE_ROADMAP.md
```
