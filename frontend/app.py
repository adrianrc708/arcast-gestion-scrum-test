from flask import Flask, render_template, request, redirect, url_for, flash, session, make_response
import requests
import os
import random  # <--- IMPORTANTE: Para que cambie cada vez
from functools import wraps

app = Flask(__name__)
app.secret_key = 'supersecreto'
BACKEND_API_URL = os.environ.get('BACKEND_API_URL', 'http://127.0.0.1:5000/api')


def no_cache(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        response = make_response(f(*args, **kwargs))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    return decorated_function


def get_auth_headers():
    token = session.get('token')
    if token:
        return {'Authorization': f'Bearer {token}'}
    return {}


@app.route('/')
def index():
    """Ruta principal: Panel de control estilo Netflix"""
    query = request.args.get('q')
    if query:
        return redirect(url_for('view_all', category='movies', search=query))

    movies = []
    tv_shows = []
    top_rated = []
    hero_movies = []

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

            # --- CARRUSEL ALEATORIO ---
            # 1. Filtramos pelis que tengan imagen de fondo y buen rating
            candidates = [m for m in movies if m.get('voteAverage', 0) > 6.0 and m.get('backdropUrl')]
            # 2. Las mezclamos al azar
            random.shuffle(candidates)
            # 3. Tomamos las 5 primeras
            hero_movies = candidates[:5]

            # Filtros de filas (Limitados a 5 para el diseño)
            limit = 5
            action_movies = [m for m in movies if 'Acción' in m.get('genres', [])][:limit]
            comedy_movies = [m for m in movies if 'Comedia' in m.get('genres', [])][:limit]
            horror_movies = [m for m in movies if 'Terror' in m.get('genres', [])][:limit]
            drama_movies = [m for m in movies if 'Drama' in m.get('genres', [])][:limit]
            scifi_movies = [m for m in movies if 'Ciencia ficción' in m.get('genres', [])][:limit]
            anim_movies = [m for m in movies if 'Animación' in m.get('genres', [])][:limit]

            # Top Rated (Ordenado por calidad)
            top_rated = sorted(movies, key=lambda x: x.get('voteAverage', 0), reverse=True)[:limit]

        # 2. Obtener Series
        resp_tv = requests.get(f"{BACKEND_API_URL}/tvshows")
        if resp_tv.status_code == 200:
            tv_shows = resp_tv.json()

    except requests.exceptions.ConnectionError:
        flash("Error de conexión", "error")

    return render_template('index.html',
                           hero_movies=hero_movies,
                           top_rated=top_rated,
                           tv_shows=tv_shows[:5],
                           action_movies=action_movies,
                           comedy_movies=comedy_movies,
                           horror_movies=horror_movies,
                           drama_movies=drama_movies,
                           scifi_movies=scifi_movies,
                           anim_movies=anim_movies)


@app.route('/view_all/<category>')
def view_all(category):
    # Obtener filtros
    genre = request.args.get('genre')
    sort = request.args.get('sort')
    platform = request.args.get('platform')
    search = request.args.get('search')

    items = []
    endpoint = "movies" if category == 'movies' else "tvshows"

    params = {}
    if genre: params['genre'] = genre
    if sort: params['sort'] = sort
    if platform: params['platform'] = platform
    if search: params['search'] = search

    try:
        response = requests.get(f"{BACKEND_API_URL}/{endpoint}", params=params)
        if response.status_code == 200:
            items = response.json()
    except:
        pass

    return render_template('view_all.html',
                           items=items,
                           category=category,
                           current_filters={'genre': genre, 'sort': sort, 'platform': platform, 'search': search})


@app.route('/movie/<content_id>', methods=['GET'])
def movie_detail(content_id):
    content = None
    content_type = 'movie'

    try:
        response = requests.get(f"{BACKEND_API_URL}/movies/{content_id}")
        if response.status_code == 200:
            content = response.json()
            content_type = 'movie'
    except requests.exceptions.ConnectionError:
        return "Error conectando al backend", 500

    if not content:
        try:
            response = requests.get(f"{BACKEND_API_URL}/tvshows/{content_id}")
            if response.status_code == 200:
                content = response.json()
                content['title'] = content.get('name')
                content['releaseDate'] = content.get('firstAirDate')
                content_type = 'tv'
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

    return render_template('movie.html', movie=content, movie_id=content_id, reviews=reviews, content_type=content_type)


@app.route('/movie/<movie_id>/add_review', methods=['POST'])
def add_review(movie_id):
    data = {
        "movieId": movie_id,
        "movieTitle": request.form.get('movieTitle'),
        "rating": int(request.form.get('rating')),
        "text": request.form.get('text'),
        "contentType": request.form.get('contentType')
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
    return redirect(url_for('movie_detail', content_id=movie_id))


@app.route('/login', methods=['GET', 'POST'])
def login():
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
            flash("Error de conexión.", "error")
    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = {"username": request.form.get('username'), "email": request.form.get('email'),
                "password": request.form.get('password')}
        try:
            response = requests.post(f"{BACKEND_API_URL}/auth/register", json=data)
            if response.status_code == 201:
                flash('Usuario registrado exitosamente.', 'success')
                return redirect(url_for('login'))
            else:
                flash(f"Error: {response.json().get('message')}", 'error')
        except requests.exceptions.ConnectionError:
            flash("Error de conexión.", "error")
    return render_template('register.html')


@app.route('/logout')
@no_cache
def logout():
    session.clear()
    flash('Has cerrado sesión.', 'success')
    return redirect(url_for('index'))


@app.route('/account')
@no_cache
def account():
    if not session.get('token'): return redirect(url_for('login'))
    try:
        headers = get_auth_headers()
        response = requests.get(f"{BACKEND_API_URL}/user/me", headers=headers)
        if response.status_code == 200:
            return render_template('account.html', user=response.json())
        else:
            return redirect(url_for('index'))
    except:
        return redirect(url_for('index'))


@app.route('/update_account', methods=['POST'])
@no_cache
def update_account():
    if not session.get('token'): return redirect(url_for('login'))
    new_username = request.form.get('username')
    try:
        headers = get_auth_headers()
        data = {"username": new_username}
        response = requests.put(f"{BACKEND_API_URL}/user/me", json=data, headers=headers)
        if response.status_code == 200:
            session['username'] = new_username
            flash('Actualizado.', 'success')
    except:
        flash("Error al actualizar.", "error")
    return redirect(url_for('account'))


@app.route('/profile')
@no_cache
def profile():
    if not session.get('token'): return redirect(url_for('login'))
    try:
        headers = get_auth_headers()
        reviews_response = requests.get(f"{BACKEND_API_URL}/user/my-reviews", headers=headers)
        watchlist_response = requests.get(f"{BACKEND_API_URL}/user/me/watchlist", headers=headers)

        my_reviews = reviews_response.json() if reviews_response.status_code == 200 else []
        my_watchlist = watchlist_response.json().get('watchlist', []) if watchlist_response.status_code == 200 else []
        return render_template('profile.html', my_reviews=my_reviews, my_watchlist=my_watchlist)
    except:
        return redirect(url_for('index'))


@app.route('/add_to_watchlist', methods=['POST'])
def add_to_watchlist():
    if not session.get('token'):
        flash('Debes iniciar sesión.', 'error')
        return redirect(url_for('login'))

    movie_id = request.form.get('movieId')
    content_type = request.form.get('contentType', 'movie')

    try:
        headers = get_auth_headers()
        data = {"movieId": movie_id, "contentType": content_type}
        requests.post(f"{BACKEND_API_URL}/user/me/watchlist", json=data, headers=headers)
    except:
        pass
    return redirect(request.referrer or url_for('index'))


@app.route('/remove_from_watchlist/<item_id>', methods=['POST'])
def remove_from_watchlist(item_id):
    if not session.get('token'): return redirect(url_for('login'))
    try:
        headers = get_auth_headers()
        requests.delete(f"{BACKEND_API_URL}/user/me/watchlist/{item_id}", headers=headers)
    except:
        pass
    return redirect(url_for('profile'))


@app.route('/delete_review/<review_id>', methods=['POST'])
def delete_review(review_id):
    if not session.get('token'): return redirect(url_for('login'))
    try:
        headers = get_auth_headers()
        requests.delete(f"{BACKEND_API_URL}/reviews/{review_id}", headers=headers)
    except:
        pass
    return redirect(url_for('profile'))


if __name__ == '__main__':
    app.run(debug=True, port=8000)