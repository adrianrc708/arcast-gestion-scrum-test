const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const Movie = require('./models/movie.model');
const TVShow = require('./models/tvshow.model');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_URL = 'https://image.tmdb.org/t/p/w500';

// Función para encontrar trailer
const findTrailer = (videos) => {
    if (!videos || !videos.results) return null;
    const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    return trailer ? trailer.key : null;
};

async function importPopularMovies() {
    try {
        console.log('🎬 Buscando películas populares...');
        const response = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
            params: { api_key: TMDB_API_KEY, language: 'es-ES' }
        });

        const movies = response.data.results;
        let count = 0;

        for (const basicData of movies) {
            // Verificar si ya existe
            const existing = await Movie.findOne({ tmdbId: basicData.id });
            if (!existing) {
                // Obtener detalles completos (para géneros y trailer)
                const detailRes = await axios.get(`${TMDB_BASE_URL}/movie/${basicData.id}`, {
                    params: {
                        api_key: TMDB_API_KEY,
                        language: 'es-ES',
                        append_to_response: 'videos'
                    }
                });
                const fullData = detailRes.data;

                const movie = new Movie({
                    title: fullData.title,
                    overview: fullData.overview,
                    posterUrl: fullData.poster_path ? `${TMDB_IMG_URL}${fullData.poster_path}` : null,
                    tmdbId: fullData.id,
                    releaseDate: fullData.release_date,
                    voteAverage: fullData.vote_average, // <--- ESTO FALTABA
                    genres: fullData.genres.map(g => g.name),
                    trailerKey: findTrailer(fullData.videos)
                });
                await movie.save();
                process.stdout.write('.'); // Barra de progreso simple
                count++;
            }
        }
        console.log(`\n✅ ${count} películas importadas.`);
    } catch (err) {
        console.error('Error en películas:', err.message);
    }
}

async function importPopularTVShows() {
    try {
        console.log('📺 Buscando series populares...');
        const response = await axios.get(`${TMDB_BASE_URL}/tv/popular`, {
            params: { api_key: TMDB_API_KEY, language: 'es-ES' }
        });

        const shows = response.data.results;
        let count = 0;

        for (const basicData of shows) {
            const existing = await TVShow.findOne({ tmdbId: basicData.id });
            if (!existing) {
                const detailRes = await axios.get(`${TMDB_BASE_URL}/tv/${basicData.id}`, {
                    params: {
                        api_key: TMDB_API_KEY,
                        language: 'es-ES',
                        append_to_response: 'videos'
                    }
                });
                const fullData = detailRes.data;

                const show = new TVShow({
                    name: fullData.name,
                    overview: fullData.overview,
                    posterUrl: fullData.poster_path ? `${TMDB_IMG_URL}${fullData.poster_path}` : null,
                    tmdbId: fullData.id,
                    firstAirDate: fullData.first_air_date,
                    voteAverage: fullData.vote_average, // <--- ESTO FALTABA
                    genres: fullData.genres.map(g => g.name),
                    trailerKey: findTrailer(fullData.videos)
                });
                await show.save();
                process.stdout.write('.');
                count++;
            }
        }
        console.log(`\n✅ ${count} series importadas.`);
    } catch (err) {
        console.error('Error en series:', err.message);
    }
}

async function runSeed() {
    console.log('🚀 Iniciando Seeding...');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado a MongoDB.');

        await importPopularMovies();
        await importPopularTVShows();

        console.log('¡Todo listo!');
        process.exit(0);
    } catch (err) {
        console.error('Error crítico:', err);
        process.exit(1);
    }
}

runSeed();