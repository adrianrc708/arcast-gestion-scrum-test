const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definición del esquema (Esto es lo que te faltaba o estaba mal escrito)
const TVShowSchema = new Schema({
    name: { type: String, required: true },
    overview: { type: String },
    posterUrl: { type: String },
    tmdbId: { type: String, unique: true, required: true },
    firstAirDate: { type: String },
    // Campos adicionales para las mejoras recientes
    genres: [{ type: String }],
    trailerKey: { type: String },
    voteAverage: { type: Number }
});

// Exportar el modelo con el nombre correcto 'TVShow'
module.exports = mongoose.model('TVShow', TVShowSchema);