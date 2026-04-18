const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const Movie = require('./models/movie.model');
const TVShow = require('./models/tvshow.model');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_URL = 'https://image.tmdb.org/t/p/w500';

const PLATFORMS = ['Netflix', 'Disney+', 'HBO Max', 'Amazon Prime', 'Apple TV'];

// --- NUEVA LISTA DE GÉNEROS ---
// 28: Acción, 35: Comedia, 27: Terror, 18: Drama, 878: Ciencia Ficción, 16: Animación
const GENRES_TO_FETCH = [28, 35, 27, 18, 878, 16];

// --- FUNCIÓN MEJORADA TAMBIÉN AQUÍ ---
const findTrailer = (videos) => {
    if (!videos || !videos.results || videos.results.length === 0) return null;
    let video = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (!video) video = videos.results.find(v => v.type === 'Teaser' && v.site === 'YouTube');
    if (!video) video = videos.results.find(v => v.site === 'YouTube');
    return video ? video.key : null;
};

const getRandomPlatform = () => PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];

async function importMoviesByGenre(genreId) {
    try {
        console.log(`🎬 Importando películas del género ${genreId}...`);
        // Pedimos 2 páginas para tener bastantes datos
        for (let page = 1; page <= 2; page++) {
            const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
                params: {
                    api_key: TMDB_API_KEY,
                    language: 'es-ES',
                    with_genres: genreId,
                    page: page
                }
            });

            for (const basicData of response.data.results) {
                const existing = await Movie.findOne({ tmdbId: basicData.id });
                if (!existing) {
                    const detailRes = await axios.get(`${TMDB_BASE_URL}/movie/${basicData.id}`, {
                        params: { api_key: TMDB_API_KEY, language: 'es-ES', append_to_response: 'videos' }
                    });
                    const fullData = detailRes.data;

                    const movie = new Movie({
                        title: fullData.title,
                        overview: fullData.overview,
                        posterUrl: fullData.poster_path ? `${TMDB_IMG_URL}${fullData.poster_path}` : null,
                        tmdbId: fullData.id,
                        releaseDate: fullData.release_date,
                        voteAverage: fullData.vote_average,
                        genres: fullData.genres.map(g => g.name),
                        trailerKey: findTrailer(fullData.videos),
                        platform: getRandomPlatform() // Asignamos plataforma al azar
                    });
                    await movie.save();
                    process.stdout.write('.');
                }
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

// (Puedes agregar una función similar para TV Shows si quieres más series)

async function runSeed() {
    console.log('🚀 Iniciando Seeding Masivo...');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado a MongoDB.');

        // Importamos por cada género definido
        for (const genreId of GENRES_TO_FETCH) {
            await importMoviesByGenre(genreId);
        }

        console.log('\n¡Todo listo!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runSeed();