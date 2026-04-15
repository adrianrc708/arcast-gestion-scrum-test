const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovieSchema = new Schema({
    title: { type: String, required: true },
    overview: { type: String }, // Descripción/Sinopsis
    posterUrl: { type: String }, // URL de la imagen del póster
    tmdbId: { type: String, unique: true, required: true }, // ID de TMDB
    releaseDate: { type: String }
});

module.exports = mongoose.model('Movie', MovieSchema);