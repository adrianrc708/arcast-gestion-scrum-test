from flask import Flask, render_template, request, redirect, url_for, flash, session, make_response
import requests
import os
# 'make_response' es nuevo, para poder añadir headers
from functools import wraps

app = Flask(__name__)
app.secret_key = 'supersecreto'
BACKEND_API_URL = os.environ.get('BACKEND_API_URL', 'http://127.0.0.1:5000/api')


# --- NUEVO: Decorador de No-Cache ---
def no_cache(f):
    """
    Decorador para evitar que el navegador guarde la página en caché.
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        response = make_response(f(*args, **kwargs))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    return decorated_function


# --- FIN DECORADOR ---

def get_auth_headers():
    """Construye los headers de autenticación si el token existe en la sesión."""
    token = session.get('token')
    if token:
        return {'Authorization': f'Bearer {token}'}
    return {}


# --- Rutas de Películas y Reseñas ---

@app.route('/')
def index():
    # ... (Esta función no cambia) ...
    movies = []
    try:
        response = requests.get(f"{BACKEND_API_URL}/movies")
        if response.status_code == 200:
            movies = response.json()
        else:
            flash("Error al cargar películas del backend.", "error")
    except requests.exceptions.ConnectionError:
        flash("Error: No se pudo conectar al backend (Node.js).", "error")
    return render_template('index.html', movies=movies)


@app.route('/movie/<movie_id>', methods=['GET'])
def movie_detail(movie_id):
    # ... (Esta función no cambia) ...
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


@app.route('/add_movie', methods=['POST'])
def add_movie():
    # ... (Esta función no cambia) ...
    title = request.form.get('title')
    if title:
        try:
            headers = get_auth_headers()
            requests.post(f"{BACKEND_API_URL}/movies", json={"title": title}, headers=headers)
        except requests.exceptions.ConnectionError:
            flash("Error conectando al backend.", "error")
    return redirect(url_for('index'))


# --- Rutas de Autenticación ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    # ... (Esta función no cambia) ...
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
    # ... (Esta función no cambia) ...
    if request.method == 'POST':
        data = {
            "username": request.form.get('username'),
            "email": request.form.get('email'),
            "password": request.form.get('password')
        }
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
@no_cache  # Aplicamos el decorador aquí
def logout():
    session.pop('token', None)
    session.pop('username', None)
    session.pop('user_email', None)
    session.pop('user_id', None)
    flash('Has cerrado sesión.', 'success')
    return redirect(url_for('index'))


# --- Rutas de Perfil y Cuenta (MODIFICADAS) ---

@app.route('/account')
@no_cache  # Aplicamos el decorador aquí
def account():
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


# --- NUEVA RUTA: Actualizar Cuenta ---
@app.route('/update_account', methods=['POST'])
@no_cache
def update_account():
    if not session.get('token'):
        return redirect(url_for('login'))

    new_username = request.form.get('username')
    new_email = request.form.get('email')

    try:
        headers = get_auth_headers()
        data = {"username": new_username, "email": new_email}
        response = requests.put(f"{BACKEND_API_URL}/user/me", json=data, headers=headers)

        if response.status_code == 200:
            # Actualizamos la sesión de Flask con el nuevo nombre
            session['username'] = new_username
            session['user_email'] = new_email
            flash('Cuenta actualizada exitosamente.', 'success')
        else:
            flash(f"Error al actualizar: {response.json().get('message')}", 'error')

    except requests.exceptions.ConnectionError:
        flash("Error de conexión al actualizar la cuenta.", "error")

    return redirect(url_for('account'))


@app.route('/profile')
@no_cache  # Aplicamos el decorador aquí
def profile():
    if not session.get('token'):
        flash('Debes iniciar sesión para ver esta página.', 'error')
        return redirect(url_for('login'))
    try:
        headers = get_auth_headers()
        # 1. Obtenemos las reseñas
        reviews_response = requests.get(f"{BACKEND_API_URL}/user/my-reviews", headers=headers)
        # 2. Obtenemos la watchlist (NUEVO)
        watchlist_response = requests.get(f"{BACKEND_API_URL}/user/me/watchlist", headers=headers)

        my_reviews = reviews_response.json() if reviews_response.status_code == 200 else []
        my_watchlist = watchlist_response.json().get('watchlist', []) if watchlist_response.status_code == 200 else []

        return render_template('profile.html', my_reviews=my_reviews, my_watchlist=my_watchlist)

    except requests.exceptions.ConnectionError:
        flash("Error de conexión al cargar el perfil.", "error")
        return redirect(url_for('index'))


# --- NUEVA RUTA: Watchlist ---
@app.route('/add_to_watchlist', methods=['POST'])
def add_to_watchlist():
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