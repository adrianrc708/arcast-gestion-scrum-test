const axios = require('axios');
const Movie = require('../models/movie.model');
const TVShow = require('../models/tvshow.model');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_URL = 'https://image.tmdb.org/t/p/w500';

// Función auxiliar para encontrar el trailer de YouTube
const findTrailer = (videos) => {
    if (!videos || !videos.results) return null;
    // Buscamos un video que sea "Trailer" y esté en "YouTube"
    const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    return trailer ? trailer.key : null; // Retornamos solo la clave (ej: d96cjJhvlMA)
};

// Importar PELÍCULA
exports.importMovie = async (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'Se requiere un título' });

    try {
        // 1. Buscar ID
        const searchRes = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
            params: { api_key: TMDB_API_KEY, query: title, language: 'es-ES' }
        });

        if (searchRes.data.results.length === 0) {
            return res.status(404).json({ message: 'No encontrada.' });
        }

        const firstResult = searchRes.data.results[0];

        // 2. Obtener DETALLES COMPLETOS (Géneros + Videos)
        const detailRes = await axios.get(`${TMDB_BASE_URL}/movie/${firstResult.id}`, {
            params: {
                api_key: TMDB_API_KEY,
                language: 'es-ES',
                append_to_response: 'videos' // <-- Truco para pedir videos
            }
        });

        const movieData = detailRes.data;

        // 3. Verificar existencia
        let movie = await Movie.findOne({ tmdbId: movieData.id });
        if (movie) return res.status(400).json({ message: 'Ya existe.' });

        // 4. Guardar
        movie = new Movie({
            title: movieData.title,
            overview: movieData.overview,
            posterUrl: movieData.poster_path ? `${TMDB_IMG_URL}${movieData.poster_path}` : null,
            tmdbId: movieData.id,
            releaseDate: movieData.release_date,
            voteAverage: movieData.vote_average,
            genres: movieData.genres.map(g => g.name), // Extraer nombres de géneros
            trailerKey: findTrailer(movieData.videos)   // Extraer trailer
        });

        await movie.save();
        res.status(201).json(movie);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al importar.' });
    }
};

// Importar SERIE
exports.importTVShow = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Se requiere un nombre' });

    try {
        // 1. Buscar ID
        const searchRes = await axios.get(`${TMDB_BASE_URL}/search/tv`, {
            params: { api_key: TMDB_API_KEY, query: name, language: 'es-ES' }
        });

        if (searchRes.data.results.length === 0) {
            return res.status(404).json({ message: 'No encontrada.' });
        }

        const firstResult = searchRes.data.results[0];

        // 2. Detalles completos
        const detailRes = await axios.get(`${TMDB_BASE_URL}/tv/${firstResult.id}`, {
            params: {
                api_key: TMDB_API_KEY,
                language: 'es-ES',
                append_to_response: 'videos'
            }
        });
        const tvData = detailRes.data;

        // 3. Verificar existencia
        let show = await TVShow.findOne({ tmdbId: tvData.id });
        if (show) return res.status(400).json({ message: 'Ya existe.' });

        // 4. Guardar
        show = new TVShow({
            name: tvData.name,
            overview: tvData.overview,
            posterUrl: tvData.poster_path ? `${TMDB_IMG_URL}${tvData.poster_path}` : null,
            tmdbId: tvData.id,
            firstAirDate: tvData.first_air_date,
            voteAverage: tvData.vote_average,
            genres: tvData.genres.map(g => g.name),
            trailerKey: findTrailer(tvData.videos)
        });

        await show.save();
        res.status(201).json(show);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al importar.' });
    }
};