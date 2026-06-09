# Despliegue y configuracion

Este documento resume como quedo configurado el dashboard de Analytics para Refrigeracion Omega.

## Arquitectura actual

El proyecto funciona con dos partes:

- Frontend estatico: `index.html`, subido a la web de Refrigeracion Omega.
- Backend Node.js: servicio en Render que consulta Google Analytics 4.

URL del frontend:

```text
https://refrigeracion-omega.com/importador/Dashboard/
```

URL del backend en Render:

```text
https://analytics-dashboard-7teo.onrender.com
```

El frontend llama al backend configurado dentro de `index.html`:

```js
const BACKEND = 'https://analytics-dashboard-7teo.onrender.com';
```

## Archivo que se sube a la web

El archivo actualizado para subir a la web queda en:

```text
outputs/web-upload/index.html
```

En este workspace la ruta completa es:

```text
C:\Users\practicante1\Documents\Codex\2026-06-09\chat-puedes-indicarme-a-cual-github\outputs\web-upload\index.html
```

Ese archivo debe reemplazar el `index.html` publicado en:

```text
https://refrigeracion-omega.com/importador/Dashboard/
```

Despues de subirlo, recargar el navegador con `Ctrl + F5` para evitar cache.

## Acceso al dashboard

El dashboard conserva un PIN simple en el frontend:

```text
2087
```

Nota importante: este PIN evita acceso casual, pero no es seguridad fuerte porque esta dentro del HTML. Para mayor seguridad real, el control de acceso deberia moverse al backend o proteger la carpeta desde el hosting.

## Render

Servicio:

```text
analytics-dashboard
```

URL:

```text
https://analytics-dashboard-7teo.onrender.com
```

Variables de entorno que deben existir en Render:

```text
PROPERTY_ID=414258625
OAUTH_CLIENT_ID=<client id del OAuth client usado en Google OAuth Playground>
OAUTH_CLIENT_SECRET=<client secret del mismo OAuth client>
GOOGLE_REFRESH_TOKEN=<refresh token generado en OAuth Playground>
CORS_ORIGIN=https://analytics-dashboard-7teo.onrender.com,https://refrigeracion-omega.com,https://www.refrigeracion-omega.com
```

Variables antiguas que no son necesarias para la configuracion actual:

```text
CLIENT_EMAIL
CLIENT_ID
PRIVATE_KEY
PRIVATE_KEY_ID
PROJECT_ID
REDIRECT_URI
SERVICE_ACCOUNT_EMAIL
SERVICE_ACCOUNT_PRIVATE_KEY
```

La configuracion actual usa `GOOGLE_REFRESH_TOKEN`, no cuenta de servicio, porque Google Analytics no acepto agregar el email de la cuenta de servicio en la gestion de acceso de la propiedad.

## Verificaciones de Render

Despues de guardar variables en Render, usar:

```text
Save, rebuild, and deploy
```

Luego probar:

```text
https://analytics-dashboard-7teo.onrender.com/auth/status
```

Respuesta esperada:

```json
{"authenticated":true,"mode":"refresh_token"}
```

Tambien probar:

```text
https://analytics-dashboard-7teo.onrender.com/api/health
```

Respuesta esperada:

```json
{"status":"ok","propertyId":"414258625","authenticated":true,"authMode":"refresh_token"}
```

El dashboard ejecutivo tambien usa este endpoint para el comparativo mensual:

```text
https://analytics-dashboard-7teo.onrender.com/api/monthly-comparison?months=6
```

Debe responder:

- `closedMonths`: meses completos para comparar de forma justa.
- `currentMonth`: mes actual parcial, solo como referencia.

## Google Cloud OAuth

Proyecto Google Cloud usado:

```text
AnalyticsAPI
```

Se creo/configuro un OAuth Client de tipo:

```text
Aplicacion web
```

Nombre recomendado:

```text
Analytics Dashboard Web
```

Redirect URI autorizado principal:

```text
https://analytics-dashboard-7teo.onrender.com/auth/callback
```

Redirect URI usado para generar el refresh token:

```text
https://developers.google.com/oauthplayground
```

Scope usado en OAuth Playground:

```text
https://www.googleapis.com/auth/analytics.readonly
```

La cuenta usada para autorizar debe tener acceso a la propiedad de Google Analytics.

## Google Analytics

Propiedad GA4:

```text
414258625
```

Sitio:

```text
refrigeracion-omega.com
```

El backend consulta la Google Analytics Data API con el refresh token de una cuenta Google que ya tiene permisos sobre esa propiedad.

El intento con cuenta de servicio no se dejo activo porque Google Analytics mostro error al agregar:

```text
analytics-dashboard-reader@analyticsapi-498917.iam.gserviceaccount.com
```

Por eso la solucion final fue OAuth con refresh token persistente en Render.

## Seguridad

Durante la configuracion se mostraron credenciales en capturas. Por seguridad, se recomienda:

1. Regenerar el `OAUTH_CLIENT_SECRET` en Google Cloud.
2. Generar un nuevo `GOOGLE_REFRESH_TOKEN` en OAuth Playground usando el secreto nuevo.
3. Reemplazar ambos valores en Render.
4. Hacer `Save, rebuild, and deploy`.
5. Verificar de nuevo `/auth/status` y `/api/health`.

No subir nunca a GitHub:

```text
OAUTH_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
PRIVATE_KEY
SERVICE_ACCOUNT_PRIVATE_KEY
```

## Flujo para actualizar el frontend

Cuando se modifique `analytics-dashboard/index.html`:

1. Copiarlo a:

```text
outputs/web-upload/index.html
```

2. Subir ese archivo a la carpeta web:

```text
/importador/Dashboard/
```

3. Recargar el sitio con `Ctrl + F5`.

4. Si hay cambios de backend, hacer commit y push a GitHub para que Render despliegue.
