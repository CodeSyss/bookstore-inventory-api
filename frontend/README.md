# Frontend

SPA en Angular para la Bookstore Inventory API. La instalación completa, la referencia de la API y la ejecución con Docker están en el [README principal](../README.md).

| Tarea | Comando |
|-------|---------|
| Instalar dependencias | `npm ci` |
| Servidor de desarrollo (http://localhost:4200) | `npm start` |
| Build de producción | `npm run build` |
| Tests unitarios (Vitest) | `npx ng test --watch=false` |

La URL de la API se define en `apiBaseUrl`: `src/environments/environment.development.ts` (desarrollo) y `src/environments/environment.ts` (build de producción, usado por Docker).
