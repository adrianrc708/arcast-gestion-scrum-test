const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const Movie = require('./models/movie.model');
const TVShow = require('./models/tvshow.model');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_URL = 'https://image.tmdb.org/t/p/original';

const GENRES_TO_FETCH = [28, 35, 27, 18, 878, 16];

// --- HELPERS DE LÓGICA DE NEGOCIO (Iguales al controller) ---
const findTrailer = (videos) => {
    if (!videos || !videos.results) return null;
    let v = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (!v) v = videos.results.find(v => v.site === 'YouTube');
    return v ? v.key : null;
};

const isInTheaters = (releaseDateStr) => {
    if (!releaseDateStr) return false;
    const release = new Date(releaseDateStr);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now - release) / (1000 * 60 * 60 * 24));
    return diffDays <= 60;
};

const getWatchProvider = (providers, releaseDate) => {
    if (providers && providers.results && providers.results.PE && providers.results.PE.flatrate) {
        const provider = providers.results.PE.flatrate[0];
        return {
            name: provider.provider_name,
            link: providers.results.PE.link,
            logo: `${TMDB_IMG_URL}${provider.logo_path}`
        };
    }
    if (isInTheaters(releaseDate)) {
        return {
            name: 'Cineplanet / Cinemark',
            link: 'https://www.cineplanet.com.pe/',
            logo: 'https://img.icons8.com/color/48/cinema-.png' // Icono genérico si no es streaming
        };
    }
    return { name: null, link: null, logo: null };
};
// -----------------------------------------------------------

async function importMoviesByGenre(genreId) {
    try {
        console.log(`🎬 Importando género ${genreId}...`);
        const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
            params: {
                api_key: TMDB_API_KEY,
                language: 'es-ES',
                with_genres: genreId,
                sort_by: 'popularity.desc',
                page: 1
            }
        });

        for (const basicData of response.data.results) {
            const existing = await Movie.findOne({ tmdbId: basicData.id });
            if (!existing) {
                // Pedimos providers en el seed también
                const detailRes = await axios.get(`${TMDB_BASE_URL}/movie/${basicData.id}`, {
                    params: {
                        api_key: TMDB_API_KEY,
                        language: 'es-ES',
                        append_to_response: 'videos,watch/providers',
                        include_video_language: 'es,en,null'
                    }
                });
                const d = detailRes.data;
                const providerInfo = getWatchProvider(d['watch/providers'], d.release_date);

                const movie = new Movie({
                    title: d.title,
                    overview: d.overview,
                    posterUrl: d.poster_path ? `${TMDB_IMG_URL}${d.poster_path}` : null,
                    backdropUrl: d.backdrop_path ? `${TMDB_BACKDROP_URL}${d.backdrop_path}` : null,
                    tmdbId: d.id,
                    releaseDate: d.release_date,
                    voteAverage: d.vote_average,
                    genres: d.genres.map(g => g.name),
                    trailerKey: findTrailer(d.videos),
                    duration: d.runtime,
                    languages: d.spoken_languages.map(l => l.name),
                    watchLink: providerInfo.link,
                    platformName: providerInfo.name,
                    platformLogo: providerInfo.logo
                });
                await movie.save();
                process.stdout.write('.');
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

async function importPopularTVShows() {
    try {
        console.log('\n📺 Importando Series Populares...');
        const response = await axios.get(`${TMDB_BASE_URL}/tv/popular`, {
            params: { api_key: TMDB_API_KEY, language: 'es-ES' }
        });

        for (const basicData of response.data.results) {
            const existing = await TVShow.findOne({ tmdbId: basicData.id });
            if (!existing) {
                const detailRes = await axios.get(`${TMDB_BASE_URL}/tv/${basicData.id}`, {
                    params: {
                        api_key: TMDB_API_KEY,
                        language: 'es-ES',
                        append_to_response: 'videos,watch/providers',
                        include_video_language: 'es,en,null'
                    }
                });
                const d = detailRes.data;
                const providerInfo = getWatchProvider(d['watch/providers'], d.first_air_date);

                const show = new TVShow({
                    name: d.name,
                    overview: d.overview,
                    posterUrl: d.poster_path ? `${TMDB_IMG_URL}${d.poster_path}` : null,
                    backdropUrl: d.backdrop_path ? `${TMDB_BACKDROP_URL}${d.backdrop_path}` : null,
                    tmdbId: d.id,
                    firstAirDate: d.first_air_date,
                    voteAverage: d.vote_average,
                    genres: d.genres.map(g => g.name),
                    trailerKey: findTrailer(d.videos),
                    seasons: d.number_of_seasons,
                    languages: d.spoken_languages.map(l => l.name),
                    watchLink: providerInfo.link,
                    platformName: providerInfo.name,
                    platformLogo: providerInfo.logo
                });
                await show.save();
                process.stdout.write('.');
            }
        }
    } catch (err) {
        console.error('Error Series:', err.message);
    }
}

async function runSeed() {
    console.log('🚀 Iniciando Seeding...');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado a MongoDB.');
        for (const genreId of GENRES_TO_FETCH) await importMoviesByGenre(genreId);
        await importPopularTVShows();
        console.log('\n¡Todo listo!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runSeed();