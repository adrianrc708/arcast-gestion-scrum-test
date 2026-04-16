const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovieSchema = new Schema({
    title: { type: String, required: true },
    overview: { type: String },
    posterUrl: { type: String },
    tmdbId: { type: String, unique: true, required: true },
    releaseDate: { type: String },
    // --- NUEVOS CAMPOS ---
    genres: [{ type: String }], // Ej: ["Drama", "Ciencia Ficción"]
    trailerKey: { type: String }, // Ej: "zSWdZVtXT7E" (ID de YouTube)
    voteAverage: { type: Number } // Para mostrar la puntuación (estrellas/porcentaje)
});

module.exports = mongoose.model('Movie', MovieSchema);