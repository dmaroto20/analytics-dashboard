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

El proyecto conserva el flujo OAuth como respaldo. Solo es necesario si no configuras `SERVICE_ACCOUNT_EMAIL` y `SERVICE_ACCOUNT_PRIVATE_KEY`.

En ese caso, crea estas variables:

```text
OAUTH_CLIENT_ID=your-google-oauth-client-id
OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
REDIRECT_URI=https://analytics-dashboard-7teo.onrender.com/auth/callback
```

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
