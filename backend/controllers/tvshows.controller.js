const TVShow = require('../models/tvshow.model');

// GET /api/tvshows -> listar con filtros
exports.getAllTVShows = async (req, res) => {
    try {
        const { genre, platform, sort } = req.query;
        let query = {};

        // Filtro por Género
        if (genre && genre !== 'Todas') {
            query.genres = genre;
        }

        // Filtro por Plataforma (Búsqueda parcial insensible a mayúsculas)
        if (platform && platform !== 'Todas') {
            query.platformName = { $regex: platform, $options: 'i' };
        }

        let sortOption = { _id: -1 }; // Por defecto: más recientes agregadas

        // Filtro de Ordenamiento
        if (sort === 'rating') sortOption = { voteAverage: -1 }; // Mayor puntaje primero
        if (sort === 'newest') sortOption = { firstAirDate: -1 }; // Estreno más reciente (campo específico de TV)

        const shows = await TVShow.find(query).sort(sortOption);
        res.json(shows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/tvshows/:id -> detalle de serie
exports.getTVShowById = async (req, res) => {
    try {
        const show = await TVShow.findById(req.params.id);
        if (!show) return res.status(404).json({ message: 'Serie no encontrada' });
        res.json(show);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};