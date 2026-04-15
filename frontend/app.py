from flask import Flask, render_template, request, redirect, url_for, flash, session, make_response
import requests
import os
from functools import wraps

app = Flask(__name__)
app.secret_key = 'supersecreto'
BACKEND_API_URL = os.environ.get('BACKEND_API_URL', 'http://127.0.0.1:5000/api')


# --- Decorador No-Cache (Sin cambios) ---
def no_cache(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        response = make_response(f(*args, **kwargs))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    return decorated_function


# --- Helper de Auth (Sin cambios) ---
def get_auth_headers():
    token = session.get('token')
    if token:
        return {'Authorization': f'Bearer {token}'}
    return {}


# --- Rutas de Películas y Reseñas ---

@app.route('/')
def index():
    """Ruta principal: mostrar lista de películas y series"""
    movies = []
    tv_shows = []  # <-- NUEVO
    try:
        # 1. Obtener Películas
        response_movies = requests.get(f"{BACKEND_API_URL}/movies")
        if response_movies.status_code == 200:
            movies = response_movies.json()

        # 2. Obtener Series (¡NECESITAREMOS ESTO!)
        # (Nota: Aún no hemos creado el backend para /api/tvshows,
        # así que por ahora solo buscamos películas)

    except requests.exceptions.ConnectionError:
        flash("Error: No se pudo conectar al backend (Node.js).", "error")

    return render_template('index.html', movies=movies, tv_shows=tv_shows)


@app.route('/movie/<movie_id>', methods=['GET'])
def movie_detail(movie_id):
    # ... (Esta función no cambia) ...
    # (El resto del código de esta función es idéntico)
    try:
        movie_response = requests.get(f"{BACKEND_API_URL}/movies/{movie_id}")
        if movie_response.status_code != 200:
            return "Película no encontrada", 404
        movie = movie_response.json()
    except requests.exceptions.ConnectionError:
        return "Error conectando al backend", 500
    reviews = []
    try:
        reviews_response = requests.get(f"{BACKEND_API_URL}/reviews/{movie_id}")
        if reviews_response.status_code == 200:
            reviews = reviews_response.json()
    except requests.exceptions.ConnectionError:
        print("Error: No se pudo conectar al backend por las reseñas.")
    return render_template('movie.html', movie=movie, movie_id=movie_id, reviews=reviews)


@app.route('/movie/<movie_id>/add_review', methods=['POST'])
def add_review(movie_id):
    # ... (Esta función no cambia) ...
    # (El resto del código de esta función es idéntico)
    data = {
        "movieId": movie_id,
        "movieTitle": request.form.get('movieTitle'),
        "rating": int(request.form.get('rating')),
        "text": request.form.get('text')
    }
    if not session.get('token'):
        data["username"] = request.form.get('username', 'Anónimo')
    try:
        headers = get_auth_headers()
        response = requests.post(f"{BACKEND_API_URL}/reviews", json=data, headers=headers)
        if response.status_code != 201:
            flash(f"Error al enviar reseña: {response.json().get('message')}", "error")
    except requests.exceptions.ConnectionError:
        print("Error: No se pudo enviar la reseña al backend.")
        flash("Error de conexión al enviar reseña.", "error")
    return redirect(url_for('movie_detail', movie_id=movie_id))


# --- MODIFICADO: De 'add_movie' a 'import_movie' ---
@app.route('/import_movie', methods=['POST'])
def import_movie():
    """Procesar formulario para IMPORTAR una película (via API)"""
    title = request.form.get('title')
    if title:
        try:
            headers = get_auth_headers()
            if not headers:
                flash("Debes iniciar sesión para importar contenido.", "error")
                return redirect(url_for('login'))

            response = requests.post(f"{BACKEND_API_URL}/import/movie", json={"title": title}, headers=headers)

            if response.status_code == 201:
                flash("Película importada exitosamente.", "success")
            else:
                flash(f"Error: {response.json().get('message')}", "error")

        except requests.exceptions.ConnectionError:
            flash("Error conectando al backend.", "error")

    return redirect(url_for('index'))


# --- NUEVA RUTA: Importar Serie de TV ---
@app.route('/import_tv', methods=['POST'])
def import_tv():
    name = request.form.get('name')
    if name:
        try:
            headers = get_auth_headers()
            if not headers:
                flash("Debes iniciar sesión para importar contenido.", "error")
                return redirect(url_for('login'))

            response = requests.post(f"{BACKEND_API_URL}/import/tv", json={"name": name}, headers=headers)

            if response.status_code == 201:
                flash("Serie importada exitosamente.", "success")
            else:
                flash(f"Error: {response.json().get('message')}", "error")

        except requests.exceptions.ConnectionError:
            flash("Error conectando al backend.", "error")

    return redirect(url_for('index'))


# --- Rutas de Autenticación (Sin cambios) ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    # ... (sin cambios) ...
    if request.method == 'POST':
        data = {"email": request.form.get('email'), "password": request.form.get('password')}
        try:
            response = requests.post(f"{BACKEND_API_URL}/auth/login", json=data)
            if response.status_code == 200:
                user_data = response.json()
                session['token'] = user_data['token']
                session['username'] = user_data['user']['username']
                session['user_email'] = user_data['user']['email']
                session['user_id'] = user_data['user']['id']
                flash('Inicio de sesión exitoso.', 'success')
                return redirect(url_for('index'))
            else:
                flash(f"Error: {response.json().get('message')}", 'error')
        except requests.exceptions.ConnectionError:
            flash("Error de conexión con el servidor de autenticación.", "error")
    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    # ... (sin cambios) ...
    if request.method == 'POST':
        data = {"username": request.form.get('username'), "email": request.form.get('email'),
                "password": request.form.get('password')}
        try:
            response = requests.post(f"{BACKEND_API_URL}/auth/register", json=data)
            if response.status_code == 201:
                flash('Usuario registrado exitosamente. Por favor, inicia sesión.', 'success')
                return redirect(url_for('login'))
            else:
                flash(f"Error al registrar: {response.json().get('message')}", 'error')
        except requests.exceptions.ConnectionError:
            flash("Error de conexión con el servidor de autenticación.", "error")
    return render_template('register.html')


@app.route('/logout')
@no_cache
def logout():
    # ... (sin cambios) ...
    session.pop('token', None)
    session.pop('username', None)
    session.pop('user_email', None)
    session.pop('user_id', None)
    flash('Has cerrado sesión.', 'success')
    return redirect(url_for('index'))


# --- Rutas de Perfil y Cuenta (Sin cambios) ---
@app.route('/account')
@no_cache
def account():
    # ... (sin cambios) ...
    if not session.get('token'):
        flash('Debes iniciar sesión para ver esta página.', 'error')
        return redirect(url_for('login'))
    try:
        headers = get_auth_headers()
        response = requests.get(f"{BACKEND_API_URL}/user/me", headers=headers)
        if response.status_code == 200:
            user = response.json()
            return render_template('account.html', user=user)
        else:
            flash('No se pudo cargar la información de la cuenta.', 'error')
            return redirect(url_for('index'))
    except requests.exceptions.ConnectionError:
        flash("Error de conexión al cargar la cuenta.", "error")
        return redirect(url_for('index'))


@app.route('/update_account', methods=['POST'])
@no_cache
def update_account():
    # ... (sin cambios) ...
    if not session.get('token'):
        return redirect(url_for('login'))
    new_username = request.form.get('username')
    try:
        headers = get_auth_headers()
        data = {"username": new_username}
        response = requests.put(f"{BACKEND_API_URL}/user/me", json=data, headers=headers)
        if response.status_code == 200:
            session['username'] = new_username
            flash('Nombre actualizado exitosamente.', 'success')
        else:
            flash(f"Error al actualizar: {response.json().get('message')}", 'error')
    except requests.exceptions.ConnectionError:
        flash("Error de conexión al actualizar la cuenta.", "error")
    return redirect(url_for('account'))


@app.route('/profile')
@no_cache
def profile():
    # ... (sin cambios) ...
    if not session.get('token'):
        flash('Debes iniciar sesión para ver esta página.', 'error')
        return redirect(url_for('login'))
    try:
        headers = get_auth_headers()
        reviews_response = requests.get(f"{BACKEND_API_URL}/user/my-reviews", headers=headers)
        watchlist_response = requests.get(f"{BACKEND_API_URL}/user/me/watchlist", headers=headers)
        my_reviews = reviews_response.json() if reviews_response.status_code == 200 else []
        my_watchlist = watchlist_response.json().get('watchlist', []) if watchlist_response.status_code == 200 else []
        return render_template('profile.html', my_reviews=my_reviews, my_watchlist=my_watchlist)
    except requests.exceptions.ConnectionError:
        flash("Error de conexión al cargar el perfil.", "error")
        return redirect(url_for('index'))


@app.route('/add_to_watchlist', methods=['POST'])
def add_to_watchlist():
    # ... (sin cambios) ...
    if not session.get('token'):
        flash('Debes iniciar sesión para agregar a tu watchlist.', 'error')
        return redirect(url_for('login'))
    movie_id = request.form.get('movieId')
    try:
        headers = get_auth_headers()
        data = {"movieId": movie_id}
        response = requests.post(f"{BACKEND_API_URL}/user/me/watchlist", json=data, headers=headers)
        if response.status_code == 200:
            flash('Película agregada a tu watchlist.', 'success')
        else:
            flash(f"Error: {response.json().get('message')}", 'error')
    except requests.exceptions.ConnectionError:
        flash("Error de conexión.", "error")
    return redirect(url_for('index'))


if __name__ == '__main__':
    app.run(debug=True, port=8000)