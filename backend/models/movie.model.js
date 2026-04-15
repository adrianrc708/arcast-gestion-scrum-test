const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definición del modelo Movie
const MovieSchema = new Schema({
    title: { type: String, required: true, unique: true },
    // Podemos agregar más campos como 'director', 'year', etc.
    // pero por ahora solo el título es suficiente.
});

module.exports = mongoose.model('Movie', MovieSchema);