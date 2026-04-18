const TVShow = require('../models/tvshow.model');

// GET /api/tvshows -> listar todas las series
exports.getAllTVShows = async (req, res) => {
    try {
        const shows = await TVShow.find().sort({ firstAirDate: -1 });
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