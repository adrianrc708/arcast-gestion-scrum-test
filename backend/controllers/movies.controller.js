const Movie = require('../models/movie.model');

// POST /api/movies -> crear película
exports.createMovie = async (req, res) => {
    try {
        const newMovie = new Movie({
            title: req.body.title
        });
        const savedMovie = await newMovie.save();
        res.status(201).json(savedMovie);
    } catch (err) {
        // Manejar error de título duplicado
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Esa película ya existe.' });
        }
        res.status(400).json({ message: err.message });
    }
};

// GET /api/movies -> listar todas
// GET /api/movies -> listar con filtros
exports.getAllMovies = async (req, res) => {
    try {
        const { genre, platform, sort } = req.query;
        let query = {};

        // Filtro por Género
        if (genre && genre !== 'Todas') {
            query.genres = genre;
        }
        // Filtro por Plataforma
        if (platform && platform !== 'Todas') {
            query.platform = platform;
        }

        let sortOption = { date: -1 }; // Por defecto: más recientes agregadas

        // Filtro de Ordenamiento
        if (sort === 'rating') sortOption = { voteAverage: -1 }; // Mayor puntaje primero
        if (sort === 'newest') sortOption = { releaseDate: -1 }; // Estreno más reciente

        const movies = await Movie.find(query).sort(sortOption);
        res.json(movies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/movies/:id -> obtener una película por ID
exports.getMovieById = async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) return res.status(404).json({ message: 'Película no encontrada' });
        res.json(movie);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};