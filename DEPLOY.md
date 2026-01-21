# Guía de Despliegue - Escoba de 15

## 1. Frontend (Vercel)

La carpeta `frontend` contiene la aplicación React. Para desplegar en Vercel:

1.  Creá un repositorio en GitHub y subí todo el código.
2.  Importá el proyecto en [Vercel](https://vercel.com/).
3.  Configurá el **Root Directory** a `frontend`.
4.  El **Build Command** es `npm run build`.
5.  El **Output Directory** es `dist`.
6.  Hacé click en **Deploy**.

## 2. Backend (Render / Railway)

El modo multijugador requiere un servidor Node.js activo para los WebSockets.

### Opción A: Render (Recomendado)

1.  Creá una cuenta en [Render.com](https://render.com/).
2.  Creá un nuevo **Web Service**.
3.  Conectá tu repositorio de GitHub.
4.  Configurá:
    *   **Root Directory**: `backend`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node index.js`
5.  Desplegá. Render te dará una URL (ej: `https://mi-escoba-backend.onrender.com`).

### Configuración Final

Una vez tengas la URL del backend, necesitás actualizar el frontend para que se conecte a ella.
1.  En `frontend/src/game/constants.js` o en un archivo `.env`, definí la URL del servidor.
2.  (Nota: En el código actual, la lógica multijugador es una base. Deberás implementar la conexión Socket.io en el cliente usando `io(URL)`).

## Estructura de Archivos

*   `frontend/src/game/engine.js`: Lógica del juego (Reglas, Puntaje).
*   `frontend/src/game/ai.js`: Inteligencia Artificial.
*   `backend/index.js`: Servidor WebSocket.
