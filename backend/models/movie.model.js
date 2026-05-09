const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovieSchema = new Schema({
    title: { type: String, required: true },
    overview: { type: String },
    posterUrl: { type: String },
    backdropUrl: { type: String }, // NUEVO: Imagen horizontal
    tmdbId: { type: String, unique: true, required: true },
    releaseDate: { type: String },
    genres: [{ type: String }],
    trailerKey: { type: String },
    voteAverage: { type: Number },

    // NUEVOS CAMPOS DE DETALLE
    duration: { type: Number }, // En minutos
    languages: [{ type: String }], // Ej: ["Español", "Inglés"]

    // DATOS DE STREAMING/CINE REALES
    watchLink: { type: String },    // Link directo (Netflix/Cineplanet)
    platformName: { type: String }, // Nombre (Netflix, Cine, etc.)
    platformLogo: { type: String }  // Logo de la plataforma
});

module.exports = mongoose.model('Movie', MovieSchema);