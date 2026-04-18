const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
    movieId: { type: String, required: true },
    movieTitle: { type: String, required: true },
    username: { type: String, required: true }, // Lo mantenemos para reseñas anónimas
    text: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    date: { type: Date, default: Date.now },

    // --- NUEVO CAMPO ---
    // Para vincular la reseña a un usuario, si está logueado
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false }
});

module.exports = mongoose.model('Review', ReviewSchema);