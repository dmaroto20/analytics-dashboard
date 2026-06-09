# Roadmap de inteligencia digital

Este documento describe la vision recomendada para evolucionar el dashboard actual de Analytics hacia un portal de inteligencia digital para Refrigeracion Omega.

La idea central es dejar de ver metricas separadas y empezar a cruzar datos entre Analytics, Search Console, rastreo de posiciones, Adwords y competencia. El objetivo no es solo reportar, sino ayudar a decidir donde invertir esfuerzo comercial, SEO, contenido y pauta.

## Objetivo general

Construir un portal que responda preguntas de negocio:

- Donde estamos creciendo.
- Donde estamos perdiendo visibilidad.
- Que canales traen visitas de mayor calidad.
- Que keywords conviene reforzar con SEO.
- Que keywords conviene apoyar con Adwords.
- Que paginas reciben trafico pero no convierten bien.
- Que competidores estan ganando posiciones relevantes.
- Que acciones deberian priorizarse el proximo mes.

## Arquitectura conceptual

La recomendacion es convertir el dashboard en un portal modular:

```text
Portal Omega
|- Analytics
|- Search Console / SEO
|- Keywords y posiciones
|- Oportunidades Adwords
|- Competencia
`- Reporte ejecutivo mensual
```

Cada modulo puede tener su propia pantalla, pero todos deben compartir datos cuando aplique. El valor principal aparece cuando se cruza informacion.

## Modulo 1: Analytics

Estado actual: ya existe una base funcional.

Datos actuales:

- Personas que llegaron al sitio.
- Visitas al sitio.
- Vistas de pagina.
- Interes / engagement.
- Permanencia promedio.
- Conversiones.
- Fuentes de trafico.
- Calidad por canal.
- Dispositivos.
- Paises.
- Nuevos vs recurrentes.
- Paginas principales.
- Comparativo mensual con meses cerrados.
- Mes en curso separado como parcial.

Mejoras recomendadas:

- Mantener el selector global de periodo.
- Mantener comparaciones justas:
  - Mes en curso contra mismos dias del mes anterior.
  - Mes completo contra mes completo anterior.
  - Ultimos 3 meses contra 3 meses anteriores.
  - Personalizado contra periodo anterior equivalente.
- Agregar explicaciones ejecutivas por seccion.
- Agregar notas automaticas cuando una metrica sube o baja significativamente.

## Modulo 2: Search Console / SEO

Google Search Console permite entender como aparece el sitio en Google antes de que el usuario entre al sitio.

Datos utiles:

- Consultas / keywords.
- Clics.
- Impresiones.
- CTR.
- Posicion promedio.
- Paginas que reciben trafico organico.
- Comparativo por fechas.
- Dispositivos.
- Paises.

Valor del modulo:

- Saber que busca la gente.
- Saber en que consultas aparece Omega.
- Detectar oportunidades con muchas impresiones y pocos clics.
- Detectar keywords con buena posicion pero bajo CTR.
- Detectar paginas que reciben trafico organico.
- Conectar keywords con paginas destino.

Ejemplo de lectura:

```text
Keyword: camaras frias
Impresiones: altas
Clics: bajos
CTR: bajo
Posicion promedio: 7.8
Accion: mejorar contenido y considerar pauta temporal.
```

## Modulo 3: Keywords y posiciones

Aunque no se pague API de Semrush, se puede trabajar con exportaciones mensuales de Position Tracking.

Flujo recomendado:

1. Exportar CSV o XLSX desde Semrush cada mes.
2. Subir el archivo al sistema.
3. Guardar historico por mes.
4. Comparar posicion actual contra meses anteriores.
5. Detectar subidas, bajadas, riesgos y oportunidades.

Datos a guardar:

- Keyword.
- Posicion actual.
- Posicion anterior.
- Cambio de posicion.
- Volumen.
- Dificultad.
- Tipo de resultado SERP, si existe.
- URL destino, si existe.
- Fecha o mes del reporte.

Vistas recomendadas:

- Keywords en posicion 1.
- Keywords en top 3.
- Keywords que subieron.
- Keywords que bajaron.
- Keywords en riesgo.
- Keywords cerca de top 3.
- Keywords comerciales prioritarias.

## Modulo 4: Unificacion por keyword

Este es el punto mas importante.

La keyword debe convertirse en el eje del portal. Para cada termino, idealmente se deberia poder ver:

```text
Keyword
|- Search Console
|  |- Impresiones
|  |- Clics
|  |- CTR
|  `- Posicion promedio
|- Rastreo de posiciones
|  |- Posicion actual
|  |- Posicion anterior
|  `- Movimiento mensual
|- Analytics
|  |- Pagina destino
|  |- Usuarios
|  |- Permanencia
|  `- Conversiones
|- Adwords
|  |- Pauta activa
|  |- Costo
|  |- Clics pagados
|  `- Conversiones pagadas
`- Competencia
   |- Competidores visibles
   |- Posicion de competidores
   `- Share of voice
```

Esto permitiria decidir si una keyword necesita SEO, pauta, contenido, optimizacion de landing o monitoreo competitivo.

## Clasificacion de keywords

Es muy importante clasificar las keywords por intencion.

Categorias recomendadas:

### Marca

Ejemplos:

```text
omega
refrigeracion omega
refri omega
omega costa rica
```

Uso:

- Miden reconocimiento de marca.
- Normalmente deberian tener buena posicion.
- Si tienen pauta activa, revisar si realmente se necesita pagar por ellas.

### Comerciales

Ejemplos:

```text
camaras frias
vitrinas refrigeradas
congelador industrial
equipos de refrigeracion comercial
```

Uso:

- Son las mas importantes para ventas.
- Si tienen posicion baja, pueden necesitar SEO y Adwords.
- Si tienen muchas impresiones y bajo CTR, revisar titulo/meta/contenido.

### Informativas

Ejemplos:

```text
como conservar carne
temperatura camara fria
mantenimiento de vitrinas refrigeradas
```

Uso:

- Sirven para contenido educativo.
- Pueden alimentar SEO de mediano plazo.
- Pueden atraer usuarios tempranos en el proceso de compra.

### Competencia

Ejemplos:

```text
nombre competidor
producto competidor
```

Uso:

- Sirven para monitorear mercado.
- Pueden indicar comparaciones o perdida de visibilidad.

## Modulo 5: Matriz de decision

La matriz de decision debe traducir datos en acciones.

Vista recomendada:

```text
Keyword | Tipo | Visibilidad SEO | Movimiento | Trafico | Conversiones | Accion sugerida
```

Reglas iniciales:

### Alto volumen, posicion baja, sin pauta

```text
Accion: activar pauta o crear/reforzar contenido.
```

### Posicion organica #1 y pauta activa costosa

```text
Accion: revisar si se puede reducir presupuesto.
```

### Muchas impresiones, bajo CTR

```text
Accion: mejorar titulo, meta description o propuesta visible.
```

### Mucho trafico, baja permanencia

```text
Accion: revisar landing, contenido y velocidad/carga.
```

### Mucho trafico, pocas conversiones

```text
Accion: revisar CTA, formulario, WhatsApp o ruta de contacto.
```

### Keyword que baja mas de 2 posiciones

```text
Accion: revisar competencia, contenido y enlaces internos.
```

### Keyword comercial fuera del top 3

```text
Accion: priorizar SEO y evaluar pauta temporal.
```

## Modulo 6: Oportunidades Adwords

Este modulo debe ayudar a decidir donde invertir pauta.

La idea no es solo ver campanas, sino usar SEO/Search Console para alimentar Adwords.

Vista recomendada:

```text
Keyword | Tipo | Impresiones | Posicion organica | CTR | Conversiones | Recomendacion pauta
```

Reglas recomendadas:

### Reforzar con pauta

Condiciones:

- Keyword comercial.
- Muchas impresiones.
- Posicion organica baja o fuera de top 3.
- Landing existente.
- Conversiones historicas o buena permanencia.

### Reducir o revisar pauta

Condiciones:

- Keyword de marca.
- Posicion organica #1.
- CTR organico alto.
- Pauta activa con costo alto.

### Optimizar anuncio o landing

Condiciones:

- Hay pauta.
- Hay clics.
- Pocas conversiones.
- Permanencia baja.

## Modulo 7: Paginas / landings

No todo debe analizarse por keyword. Tambien hay que analizar paginas.

Vista recomendada:

```text
Pagina | Keywords que atrae | Clics SEO | Usuarios | Permanencia | Conversiones | Accion
```

Preguntas que debe responder:

- Que paginas sostienen el trafico organico.
- Que paginas tienen buen trafico pero baja conversion.
- Que paginas tienen baja permanencia.
- Que paginas deberian recibir pauta.
- Que paginas necesitan mejor contenido.

Ejemplos de acciones:

```text
Pagina con trafico alto y conversion baja:
Mejorar CTA, WhatsApp, formulario o propuesta comercial.

Pagina con impresiones altas y pocos clics:
Mejorar titulo/meta o snippet.

Pagina con keyword comercial y posicion 4-10:
Reforzar contenido y enlaces internos.
```

## Modulo 8: Competencia

Este modulo puede venir despues, pero conviene preparar la estructura desde ahora.

Datos posibles:

- Competidores por keyword.
- Posicion de competidores.
- Keywords donde Omega no aparece bien.
- Keywords donde competidores ganan.
- Share of voice.
- Comparacion de landing pages.
- Presencia en pauta, si se logra obtener.

Vista recomendada:

```text
Keyword | Omega | Competidor A | Competidor B | Riesgo | Accion
```

Ejemplo:

```text
Keyword: camara fria industrial
Omega: posicion 5
Competidor A: posicion 2
Competidor B: posicion 3
Accion: reforzar contenido + pauta temporal.
```

## Modulo 9: Reporte mensual ejecutivo

El portal deberia poder producir un resumen mensual.

Contenido recomendado:

- Que mejoro.
- Que bajo.
- Keywords ganadas.
- Keywords perdidas.
- Canales de mayor calidad.
- Paginas con mejor rendimiento.
- Paginas con oportunidad.
- Recomendaciones SEO.
- Recomendaciones Adwords.
- Riesgos competitivos.
- Acciones sugeridas para el proximo mes.

Formato posible:

- Dashboard interactivo.
- HTML estatico.
- PDF mensual.
- Resumen para junta.

## Modelo de datos recomendado

Para una primera fase se puede usar archivos CSV/JSON.

Estructura posible:

```text
data/
|- search-console/
|  |- 2026-05.csv
|  `- 2026-06.csv
|- semrush-position-tracking/
|  |- 2026-05.csv
|  `- 2026-06.csv
|- keyword-classification.csv
`- competitors.csv
```

Despues, si crece, conviene una base de datos pequena.

Opciones:

- SQLite para algo simple.
- Postgres si se hospeda completo en Render.
- Google Sheets como etapa intermedia.

## Fases recomendadas

### Fase 1: Portal base

- Crear portada de modulos.
- Mantener Analytics como modulo actual.
- Preparar secciones futuras:
  - SEO/Search Console.
  - Keywords.
  - Adwords oportunidades.
  - Competencia.

### Fase 2: Search Console

- Conectar API o iniciar con CSV.
- Mostrar consultas, paginas, clics, impresiones, CTR y posicion.
- Agregar comparativos por periodo.

### Fase 3: Rastreo mensual de posiciones

- Definir formato de importacion Semrush.
- Crear carga mensual.
- Guardar historico.
- Mostrar subidas, bajadas y riesgos.

### Fase 4: Cruce SEO + Analytics

- Conectar keyword con pagina destino.
- Conectar pagina con permanencia y conversiones.
- Detectar paginas con trafico pero bajo rendimiento.

### Fase 5: Recomendaciones Adwords

- Crear reglas iniciales.
- Generar lista de keywords para reforzar.
- Generar lista de keywords donde se puede revisar gasto.

### Fase 6: Competencia

- Registrar competidores principales.
- Cruzar competidores por keyword.
- Mostrar riesgos y oportunidades.

### Fase 7: Reporte mensual automatico

- Generar resumen ejecutivo mensual.
- Exportar o preparar version para junta.

## Recomendacion de producto

No conviene meter todo dentro del dashboard actual como mas graficos. Conviene evolucionar a un portal:

```text
Analytics = salud del sitio.
Search Console = visibilidad organica.
Keywords = movimiento SEO.
Adwords = decisiones de pauta.
Competencia = contexto de mercado.
Reporte mensual = decision ejecutiva.
```

La clave es que cada modulo responda una pregunta concreta:

- Analytics: que paso dentro del sitio.
- Search Console: como nos encontro Google.
- Keywords: como se mueven las posiciones.
- Adwords: donde invertir o ajustar pauta.
- Competencia: contra quien estamos ganando o perdiendo.

## Proximo paso recomendado

Antes de construir competencia, el siguiente paso mas valioso seria:

1. Crear modulo SEO/Search Console.
2. Permitir cargar o conectar datos de Search Console.
3. Crear modulo de keywords con importacion mensual de Semrush.
4. Crear una primera matriz de decision SEO + Adwords.

Esto daria una vision clara de:

- Que keywords importan.
- Que keywords estan subiendo o bajando.
- Que paginas reciben ese trafico.
- Que canales traen usuarios de calidad.
- Donde conviene meter fuerza con Adwords.

