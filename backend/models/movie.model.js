const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovieSchema = new Schema({
    // ... (campos existentes) ...
    title: { type: String, required: true },
    overview: { type: String },
    posterUrl: { type: String },
    tmdbId: { type: String, unique: true, required: true },
    releaseDate: { type: String },
    genres: [{ type: String }],
    trailerKey: { type: String },
    voteAverage: { type: Number },
    // NUEVO CAMPO
    platform: { type: String } // Ej: "Netflix", "HBO Max", "Disney+"
});

module.exports = mongoose.model('Movie', MovieSchema);