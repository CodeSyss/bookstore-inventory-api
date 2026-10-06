# Bookstore Inventory API

API REST (Django + DRF) y SPA en Angular para gestionar el inventario de una cadena de librerías y calcular el precio de venta sugerido a partir de tasas de cambio USD en tiempo real.

| Parte | Stack | URL por defecto |
|-------|-------|-----------------|
| Backend | Python 3.13, Django 6.1, Django REST Framework | http://localhost:8000 |
| Documentación de la API (Swagger) | drf-spectacular | http://localhost:8000/api/docs |
| Frontend | Angular 22, Angular Material, Signals | http://localhost:4200 |

## Requisitos previos

| Para ejecutar con | Se necesita |
|-------------------|-----------|
| **Docker** (recomendado) | [Docker](https://docs.docker.com/get-docker/) con Docker Compose |
| **Sin Docker** | Python 3.13+, Node.js 22+ y npm 10+ |

En ambos casos se necesita Git y conexión a internet (para la API de tasas de cambio).

## Instalación y ejecución

### 1. Obtener el código

```bash
git clone https://github.com/CodeSyss/bookstore-inventory-api.git
cd bookstore-inventory-api
```

### 2a. Con Docker (recomendado)

```bash
docker compose up --build
```

1. Abrir http://localhost:4200 y crear un libro.
2. Presionar **Calcular precio de venta** para ver el desglose del cálculo.
3. Los datos persisten en el volumen `backend-data` (`docker compose down -v` los borra).

### 2b. Sin Docker

**Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

La API queda disponible en http://localhost:8000. Opcionalmente se puede copiar `.env.example` a `.env` (`cp` en macOS/Linux/PowerShell, `copy` en CMD) para cambiar la configuración; todas las variables tienen un valor por defecto.

**Frontend** (en otra terminal)

```bash
cd frontend
npm ci
npm start
```

La aplicación queda disponible en http://localhost:4200 y consume la API definida en `apiBaseUrl` (`src/environments/environment.development.ts`).

## Ejemplos de uso de los endpoints

Las rutas no llevan barra final. Los cuerpos de petición y respuesta son JSON y los decimales se devuelven como números.

| Método | Ruta | Descripción | Éxito |
|--------|------|-------------|-------|
| `POST` | `/books` | Crear libro | 201 |
| `GET` | `/books?page=1` | Listar libros, más recientes primero (10 por página) | 200 |
| `GET` | `/books/{id}` | Obtener libro por ID | 200 |
| `PUT` | `/books/{id}` | Actualizar libro (todos los campos) | 200 |
| `DELETE` | `/books/{id}` | Eliminar libro | 204 |
| `GET` | `/books/search?category={category}` | Buscar por categoría (exacta, sin distinguir mayúsculas), paginado | 200 |
| `GET` | `/books/low-stock?threshold=10` | Libros con `stock_quantity <= threshold`, paginado | 200 |
| `POST` | `/books/{id}/calculate-price` | Calcular y guardar el precio de venta sugerido | 200 |

> Los ejemplos usan `curl` con sintaxis de bash (macOS, Linux, Git Bash). En PowerShell es más simple probar los endpoints desde Swagger (http://localhost:8000/api/docs) o con la colección de Postman.

**Crear un libro**

```bash
curl -X POST http://localhost:8000/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "El Quijote",
    "author": "Miguel de Cervantes",
    "isbn": "978-84-376-0494-7",
    "cost_usd": 15.99,
    "stock_quantity": 25,
    "category": "Literatura Clásica",
    "supplier_country": "ES"
  }'
```

```json
{
  "id": 1,
  "title": "El Quijote",
  "author": "Miguel de Cervantes",
  "isbn": "978-84-376-0494-7",
  "cost_usd": 15.99,
  "selling_price_local": null,
  "stock_quantity": 25,
  "category": "Literatura Clásica",
  "supplier_country": "ES",
  "created_at": "2026-10-06T03:08:08.191535Z",
  "updated_at": "2026-10-06T03:08:08.191590Z"
}
```

**Calcular el precio de venta**

```bash
curl -X POST http://localhost:8000/books/1/calculate-price
```

```json
{
  "book_id": 1,
  "cost_usd": 15.99,
  "exchange_rate": 0.85,
  "cost_local": 13.59,
  "margin_percentage": 40,
  "selling_price_local": 19.03,
  "currency": "EUR",
  "rate_source": "live",
  "calculation_timestamp": "2026-10-06T03:08:10.532969Z"
}
```

> La tasa es la del día, por lo que `exchange_rate` y los montos calculados varían. Con la tasa del ejemplo de la prueba (0.85) el resultado es exactamente el de arriba; un test automatizado lo verifica.

**Listar, buscar y stock bajo**

```bash
curl "http://localhost:8000/books?page=1"
curl "http://localhost:8000/books/search?category=Literatura%20Clásica"
curl "http://localhost:8000/books/low-stock?threshold=10"
```

Las respuestas paginadas tienen la forma `{"count", "next", "previous", "results": [...]}`.

### Reglas de negocio

| Regla | Comportamiento |
|-------|----------------|
| `cost_usd` debe ser mayor a 0 | 400 |
| `stock_quantity` no puede ser negativo | 400 |
| `isbn` debe ser un ISBN-10 o ISBN-13 válido (se verifica el dígito de control; se aceptan guiones y espacios) | 400 |
| No se permiten libros duplicados (mismo ISBN) | 400, también entre formatos: `978-84-376-0494-7` = `9788437604947` |
| `supplier_country` debe ser un código de 2 letras | 400; se guarda en mayúsculas |
| Libro inexistente | 404 |
| Falla la API de tasas de cambio | Se usa la tasa por defecto y se indica `rate_source: "fallback"` |
| Falla la API y no hay tasa por defecto configurada | 503 |
| Error inesperado | 500, sin exponer detalles internos |

### Formato de errores

Todas las respuestas de error tienen la misma estructura:

```json
{
  "status": 400,
  "error": "validation_error",
  "message": "Datos inválidos.",
  "details": { "isbn": ["Ya existe un libro con este ISBN."] }
}
```

`error` puede ser `validation_error`, `not_found`, `method_not_allowed`, `service_unavailable` o `internal_error`. `details` es `null` salvo que haya errores por campo.

### Cálculo del precio

1. Se toma el `cost_usd` del libro.
2. Se obtiene la tasa USD → `LOCAL_CURRENCY` desde `https://api.exchangerate-api.com/v4/latest/USD`.
3. `cost_local = cost_usd × tasa` y se aplica el margen del 40 %: `selling_price_local = cost_local × 1.40`. Ambos valores se redondean a 2 decimales (redondeo half-up).
4. Se guarda `selling_price_local` en el libro y se devuelve el desglose.

## Configuración

El backend lee la configuración desde variables de entorno o desde `backend/.env` (ver `backend/.env.example`).

| Variable | Valor por defecto | Uso |
|----------|-------------------|-----|
| `SECRET_KEY` | clave solo para desarrollo | Clave secreta de Django; **definirla en producción** |
| `DEBUG` | `True` | Modo debug |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hosts permitidos, separados por coma |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | Orígenes del frontend autorizados a llamar a la API |
| `EXCHANGE_API_URL` | exchangerate-api v4 USD | Fuente de las tasas de cambio |
| `EXCHANGE_API_TIMEOUT` | `5` | Segundos de espera antes de usar la tasa por defecto |
| `LOCAL_CURRENCY` | `EUR` | Moneda local de destino |
| `DEFAULT_EXCHANGE_RATE` | `0.85` | Tasa por defecto; vacía la desactiva (y la falla de la API devuelve 503) |
| `SQLITE_PATH` | `backend/db.sqlite3` | Ubicación del archivo de base de datos |

## Tests

```bash
# Backend (pytest)
cd backend
python -m pytest

# Frontend (Vitest)
cd frontend
npx ng test --watch=false
```

### Colección de Postman

Importar `postman/bookstore-inventory-api.postman_collection.json` y ejecutarla con el Collection Runner: crea un libro, recorre todos los endpoints y casos de error, y al final lo elimina. Cada ejecución genera un ISBN válido aleatorio, por lo que puede correrse varias veces. Si la API no está en `http://localhost:8000`, ajustar la variable `baseUrl`.

También se puede ejecutar desde la terminal:

```bash
npx newman run postman/bookstore-inventory-api.postman_collection.json
```

## Estructura del proyecto

```
backend/
  config/            Settings, URLs y manejador de errores unificado
  books/
    models.py        Modelo Book y restricciones de base de datos
    validators.py    Normalización del ISBN y validación del dígito de control
    serializers.py   Validación y detección de duplicados
    views.py         CRUD, search, low-stock, calculate-price
    services/        Cliente de tasas de cambio y lógica de precios
    tests/           Tests de la API y del cálculo de precios
frontend/src/app/
  books/
    domain/          Modelos, reglas del ISBN y puerto del repositorio (sin dependencias de Angular)
    infrastructure/  Adaptador HTTP de la API
    application/     Store basado en signals
    ui/              Componentes presentacionales
    pages/           Contenedores de rutas (listado, detalle, formulario)
  core/              Interceptor de errores, notificaciones, layout
  shared/            Diálogo de confirmación, validadores, UI reutilizable
postman/             Colección de Postman
```

## Decisiones de diseño

| Tema | Decisión |
|------|----------|
| Almacenamiento del ISBN | Se guarda tal como se envía (por ejemplo `978-84-376-0494-7`, como en el enunciado). La unicidad se aplica sobre el valor normalizado mediante una restricción de base de datos, de modo que el mismo ISBN no puede registrarse dos veces con distinto formato. |
| Fallas de la API externa | Nunca bloquean el cálculo: se usa la tasa por defecto configurada y se marca como `fallback`. |
| Lógica de negocio | Vive en `books/services` y no en las vistas, para poder probarla sin HTTP. |
| Arquitectura del frontend | Screaming architecture por funcionalidad con puertos y adaptadores: el store depende de un puerto de repositorio y solo el adaptador HTTP conoce las URLs. Componentes contenedores y presentacionales separados. |
| Docker | La SPA y la API comparten la ruta `/books`, por lo que el navegador llama a la API directamente en el puerto 8000 (habilitado por CORS) en lugar de pasar por un proxy de nginx. |
