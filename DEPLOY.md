# Guía de Despliegue - Escoba de 15 (Versión Supabase)

## 1. Configuración de Supabase
El juego ahora usa Supabase Realtime para el multijugador. No necesitas un servidor adicional.

1.  Crea un proyecto en [Supabase](https://supabase.com/).
2.  Obtén la `URL` y la `Anon Key` desde *Project Settings -> API*.
3.  En Vercel, deberás configurar estas variables de entorno:
    *   `VITE_SUPABASE_URL`
    *   `VITE_SUPABASE_ANON_KEY`

## 2. Despliegue en Vercel

1.  Sube el código a GitHub.
2.  Importa el proyecto en Vercel.
3.  **Root Directory**: Pon `frontend`.
4.  **Environment Variables**: Agrega las dos claves de Supabase mencionadas arriba.
5.  **Build Command**: `npm run build`.
6.  **Output Directory**: `dist`.

## 3. ¿Por qué Supabase?
- **Sin retardos**: A diferencia de Render, Supabase no se apaga. Puedes jugar al instante con tu sobrino.
- **Estabilidad**: La conexión Realtime es más robusta para móviles.
- **Escalabilidad**: Soporta muchos jugadores simultáneos sin configurar nada más.
