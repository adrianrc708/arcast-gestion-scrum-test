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
exports.getAllMovies = async (req, res) => {
    try {
        const movies = await Movie.find();
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