const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TVShowSchema = new Schema({
    name: { type: String, required: true },
    overview: { type: String },
    posterUrl: { type: String },
    backdropUrl: { type: String }, // NUEVO
    tmdbId: { type: String, unique: true, required: true },
    firstAirDate: { type: String },
    genres: [{ type: String }],
    trailerKey: { type: String },
    voteAverage: { type: Number },

    // NUEVOS CAMPOS
    seasons: { type: Number }, // Cantidad de temporadas
    languages: [{ type: String }],

    watchLink: { type: String },
    platformName: { type: String },
    platformLogo: { type: String }
});

module.exports = mongoose.model('TVShow', TVShowSchema);