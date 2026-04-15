# Mini Plataforma de Reseñas de Películas

Proyecto full stack (Node.js/Express + Python/Flask) con MongoDB.

## ¿Cómo ejecutar el proyecto? (Windows)

Necesitarás tener dos terminales abiertas (ej. una en WebStorm y otra en PyCharm).

### Backend (Node.js)

1.  **Configurar:** Crea el archivo `backend/.env` (puedes copiar `backend/.env.example`) y pega tu `MONGO_URI` de MongoDB Atlas.
2.  **Instalar:** Abre una terminal en `backend/` y ejecuta:
    ```bash
    npm install express mongoose dotenv cors
    ```
3.  **Ejecutar:** En esa misma terminal, corre el servidor:
    ```bash
    node server.js
    ```
*(El backend quedará corriendo en el puerto 5000)*

### Frontend (Python)

1.  **Configurar:** Abre una segunda terminal en `frontend/` y ejecuta estos dos comandos para crear y activar el entorno virtual:
    ```bash
    py -m venv venv
    .\venv\Scripts\Activate
    ```
2.  **Instalar:** Con el `(venv)` activo, ejecuta:
    ```bash
    pip install Flask requests
    ```
3.  **Ejecutar:** En esa misma terminal, corre la app:
    ```bash
    py app.py
    ```
*(El frontend quedará corriendo en el puerto 8000)*

---
**En resumen:** Configura el `.env` del backend. Luego, abre dos terminales: una para ejecutar `node server.js` (backend) y otra (con el `venv` activado) para ejecutar `py app.py` (frontend).

**Abre `http://127.0.0.1:8000` en tu navegador.**