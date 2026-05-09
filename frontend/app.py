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

# ... (Imports y configuraciones anteriores siguen igual) ...
# Asegúrate de mantener todo lo anterior (imports, app config, decorators, etc.)

# ... (imports y configuraciones) ...

@app.route('/')
def index():
    """Ruta principal: Panel de control estilo Netflix"""
    movies = []
    tv_shows = []
    top_rated = []

    # Listas por género
    action_movies = []
    comedy_movies = []
    horror_movies = []
    drama_movies = []
    scifi_movies = []
    anim_movies = []

    try:
        # 1. Obtener Películas
        resp_mov = requests.get(f"{BACKEND_API_URL}/movies")
        if resp_mov.status_code == 200:
            movies = resp_mov.json()

            # --- CAMBIO AQUÍ: Limitar a 5 elementos por fila ---
            limit = 5
            action_movies = [m for m in movies if 'Acción' in m.get('genres', [])][:limit]
            comedy_movies = [m for m in movies if 'Comedia' in m.get('genres', [])][:limit]
            horror_movies = [m for m in movies if 'Terror' in m.get('genres', [])][:limit]
            drama_movies = [m for m in movies if 'Drama' in m.get('genres', [])][:limit]
            scifi_movies = [m for m in movies if 'Ciencia ficción' in m.get('genres', [])][:limit]
            anim_movies = [m for m in movies if 'Animación' in m.get('genres', [])][:limit]

        # 2. Obtener Series
        resp_tv = requests.get(f"{BACKEND_API_URL}/tvshows")
        if resp_tv.status_code == 200:
            tv_shows = resp_tv.json()

        # 3. Top Rated
        all_content = movies + tv_shows
        top_rated = [item for item in all_content if item.get('voteAverage') and item.get('voteAverage') > 7.5]
        top_rated.sort(key=lambda x: x['voteAverage'], reverse=True)
        top_rated = top_rated[:limit]  # También limitamos a 5

    except requests.exceptions.ConnectionError:
        flash("Error de conexión", "error")

    return render_template('index.html',
                           top_rated=top_rated,
                           tv_shows=tv_shows[:limit],  # Limitamos series a 5
                           action_movies=action_movies,
                           comedy_movies=comedy_movies,
                           horror_movies=horror_movies,
                           drama_movies=drama_movies,
                           scifi_movies=scifi_movies,
                           anim_movies=anim_movies)

# --- NUEVA RUTA: Ver Todo con Filtros ---
@app.route('/view_all/<category>')
def view_all(category):
    """
    category puede ser 'movies' o 'tvshows'.
    Recibe query params: ?genre=Acción&sort=rating&platform=Netflix
    """
    # Obtener filtros de la URL
    genre = request.args.get('genre')
    sort = request.args.get('sort')
    platform = request.args.get('platform')

    items = []
    endpoint = "movies" if category == 'movies' else "tvshows"

    # Construir params para enviar al backend
    params = {}
    if genre: params['genre'] = genre
    if sort: params['sort'] = sort
    if platform: params['platform'] = platform

    try:
        response = requests.get(f"{BACKEND_API_URL}/{endpoint}", params=params)
        if response.status_code == 200:
            items = response.json()
    except:
        pass

    return render_template('view_all.html',
                           items=items,
                           category=category,
                           current_filters={'genre': genre, 'sort': sort, 'platform': platform})


# ... (Resto de rutas: movie_detail, etc.) ...


# ... (El resto de rutas: movie_detail, import, login, etc. SE MANTIENEN IGUAL) ...
# SOLO TIENES QUE REEMPLAZAR LA FUNCIÓN 'index'


# ... (imports y configuraciones anteriores siguen igual) ...

# ... (imports y demás código anterior igual) ...

@app.route('/movie/<content_id>', methods=['GET'])
def movie_detail(content_id):
    """Detalle de película O serie"""
    content = None
    content_type = 'movie'  # Por defecto

    # 1. Intentar buscar en PELÍCULAS
    try:
        response = requests.get(f"{BACKEND_API_URL}/movies/{content_id}")
        if response.status_code == 200:
            content = response.json()
            content_type = 'movie'  # Es una película
    except requests.exceptions.ConnectionError:
        return "Error conectando al backend", 500

    # 2. Si no, buscar en SERIES
    if not content:
        try:
            response = requests.get(f"{BACKEND_API_URL}/tvshows/{content_id}")
            if response.status_code == 200:
                content = response.json()
                content['title'] = content.get('name')
                content['releaseDate'] = content.get('firstAirDate')
                content_type = 'tv'  # Es una serie
        except:
            pass

    if not content:
        return "Contenido no encontrado", 404

    reviews = []
    try:
        reviews_response = requests.get(f"{BACKEND_API_URL}/reviews/{content_id}")
        if reviews_response.status_code == 200:
            reviews = reviews_response.json()
    except:
        pass

    # Pasamos 'content_type' a la plantilla
    return render_template('movie.html', movie=content, movie_id=content_id, reviews=reviews, content_type=content_type)


@app.route('/movie/<movie_id>/add_review', methods=['POST'])
def add_review(movie_id):
    """Procesar formulario para crear reseña"""

    data = {
        "movieId": movie_id,
        "movieTitle": request.form.get('movieTitle'),
        "rating": int(request.form.get('rating')),
        "text": request.form.get('text'),
        "contentType": request.form.get('contentType')  # Enviamos el tipo al backend
    }

    if not session.get('token'):
        data["username"] = request.form.get('username', 'Anónimo')

    try:
        headers = get_auth_headers()
        response = requests.post(f"{BACKEND_API_URL}/reviews", json=data, headers=headers)

        if response.status_code != 201:
            flash(f"Error: {response.json().get('message')}", "error")
    except requests.exceptions.ConnectionError:
        flash("Error de conexión.", "error")

    # --- CORRECCIÓN DEL ERROR AQUÍ ---
    # Antes decía: movie_id=movie_id (Incorrecto)
    # Ahora dice: content_id=movie_id (Correcto, coincide con la ruta @app.route('/movie/<content_id>'))
    return redirect(url_for('movie_detail', content_id=movie_id))


# ... (resto del archivo igual) ...

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


# ...

# --- MODIFICADO: Agregar a Watchlist (Recibe contentType) ---
@app.route('/add_to_watchlist', methods=['POST'])
def add_to_watchlist():
    if not session.get('token'):
        flash('Debes iniciar sesión.', 'error')
        return redirect(url_for('login'))

    movie_id = request.form.get('movieId')
    content_type = request.form.get('contentType', 'movie')  # Default a movie si no se envía

    try:
        headers = get_auth_headers()
        # Enviamos contentType ('movie' o 'tv')
        data = {"movieId": movie_id, "contentType": content_type}
        response = requests.post(f"{BACKEND_API_URL}/user/me/watchlist", json=data, headers=headers)

        if response.status_code == 200:
            flash('Agregado a tu watchlist.', 'success')
        elif response.status_code == 400:
            flash('Ya está en tu watchlist.', 'error')
        else:
            flash(f"Error: {response.json().get('message')}", 'error')

    except requests.exceptions.ConnectionError:
        flash("Error de conexión.", "error")

    # Regresar a la misma página
    return redirect(request.referrer or url_for('index'))


# --- NUEVA RUTA: Eliminar de Watchlist ---
@app.route('/remove_from_watchlist/<item_id>', methods=['POST'])
def remove_from_watchlist(item_id):
    if not session.get('token'): return redirect(url_for('login'))

    try:
        headers = get_auth_headers()
        requests.delete(f"{BACKEND_API_URL}/user/me/watchlist/{item_id}", headers=headers)
        flash('Eliminado de la watchlist.', 'success')
    except:
        flash("Error al eliminar.", "error")

    return redirect(url_for('profile'))


# --- NUEVA RUTA: Eliminar Reseña ---
@app.route('/delete_review/<review_id>', methods=['POST'])
def delete_review(review_id):
    if not session.get('token'): return redirect(url_for('login'))

    try:
        headers = get_auth_headers()
        requests.delete(f"{BACKEND_API_URL}/reviews/{review_id}", headers=headers)
        flash('Reseña eliminada.', 'success')
    except:
        flash("Error al eliminar reseña.", "error")

    return redirect(url_for('profile'))


# ...

if __name__ == '__main__':
    app.run(debug=True, port=8000)