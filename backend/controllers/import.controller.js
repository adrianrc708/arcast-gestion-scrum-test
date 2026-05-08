const axios = require('axios');
const Movie = require('../models/movie.model');
const TVShow = require('../models/tvshow.model');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_URL = 'https://image.tmdb.org/t/p/original'; // Imagen HD

// Helper: Buscar Video
const findTrailer = (videos) => {
    if (!videos || !videos.results) return null;
    let v = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (!v) v = videos.results.find(v => v.site === 'YouTube'); // Fallback a cualquier video
    return v ? v.key : null;
};

// Helper: ¿Está en cartelera? (Estreno hace menos de 2 meses)
const isInTheaters = (releaseDateStr) => {
    if (!releaseDateStr) return false;
    const release = new Date(releaseDateStr);
    const now = new Date();
    const diffTime = Math.abs(now - release);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 60; // 60 días en cartelera aprox
};

// Helper: Lógica de Dónde Ver
const getWatchProvider = (providers, releaseDate) => {
    // 1. Buscar Streaming en Perú (PE)
    if (providers && providers.results && providers.results.PE && providers.results.PE.flatrate) {
        const provider = providers.results.PE.flatrate[0];
        return {
            name: provider.provider_name,
            link: providers.results.PE.link,
            logo: `${TMDB_IMG_URL}${provider.logo_path}`,
            type: 'streaming'
        };
    }

    // 2. Si no hay streaming, ¿Es reciente? -> Cine
    if (isInTheaters(releaseDate)) {
        return {
            name: 'Cineplanet / Cinemark',
            link: 'https://www.cineplanet.com.pe/', // Link directo a cines
            logo: 'https://i.imgur.com/Q1f8v8y.png', // Icono de ticket genérico
            type: 'theater'
        };
    }

    // 3. Nada
    return { name: null, link: null, logo: null, type: null };
};

exports.importMovie = async (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'Falta título' });

    try {
        const search = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
            params: { api_key: TMDB_API_KEY, query: title, language: 'es-ES' }
        });
        if (!search.data.results.length) return res.status(404).json({ message: 'No encontrada' });
        const first = search.data.results[0];

        const details = await axios.get(`${TMDB_BASE_URL}/movie/${first.id}`, {
            params: {
                api_key: TMDB_API_KEY,
                language: 'es-ES',
                append_to_response: 'videos,watch/providers',
                include_video_language: 'es,en,null'
            }
        });
        const data = details.data;
        const providerInfo = getWatchProvider(data['watch/providers'], data.release_date);

        let movie = await Movie.findOne({ tmdbId: data.id });
        if (movie) return res.status(400).json({ message: 'Ya existe' });

        movie = new Movie({
            title: data.title,
            overview: data.overview,
            posterUrl: data.poster_path ? `${TMDB_IMG_URL}${data.poster_path}` : null,
            backdropUrl: data.backdrop_path ? `${TMDB_BACKDROP_URL}${data.backdrop_path}` : null,
            tmdbId: data.id,
            releaseDate: data.release_date,
            voteAverage: data.vote_average,
            genres: data.genres.map(g => g.name),
            trailerKey: findTrailer(data.videos),
            duration: data.runtime,
            languages: data.spoken_languages.map(l => l.name), // Nombre del idioma
            watchLink: providerInfo.link,
            platformName: providerInfo.name,
            platformLogo: providerInfo.logo
        });

        await movie.save();
        res.status(201).json(movie);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error server' });
    }
};

exports.importTVShow = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Falta nombre' });

    try {
        const search = await axios.get(`${TMDB_BASE_URL}/search/tv`, {
            params: { api_key: TMDB_API_KEY, query: name, language: 'es-ES' }
        });
        if (!search.data.results.length) return res.status(404).json({ message: 'No encontrada' });
        const first = search.data.results[0];

        const details = await axios.get(`${TMDB_BASE_URL}/tv/${first.id}`, {
            params: {
                api_key: TMDB_API_KEY,
                language: 'es-ES',
                append_to_response: 'videos,watch/providers',
                include_video_language: 'es,en,null'
            }
        });
        const data = details.data;
        const providerInfo = getWatchProvider(data['watch/providers'], data.first_air_date);

        let show = await TVShow.findOne({ tmdbId: data.id });
        if (show) return res.status(400).json({ message: 'Ya existe' });

        show = new TVShow({
            name: data.name,
            overview: data.overview,
            posterUrl: data.poster_path ? `${TMDB_IMG_URL}${data.poster_path}` : null,
            backdropUrl: data.backdrop_path ? `${TMDB_BACKDROP_URL}${data.backdrop_path}` : null,
            tmdbId: data.id,
            firstAirDate: data.first_air_date,
            voteAverage: data.vote_average,
            genres: data.genres.map(g => g.name),
            trailerKey: findTrailer(data.videos),
            seasons: data.number_of_seasons,
            languages: data.spoken_languages.map(l => l.name),
            watchLink: providerInfo.link,
            platformName: providerInfo.name,
            platformLogo: providerInfo.logo
        });

        await show.save();
        res.status(201).json(show);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error server' });
    }
};