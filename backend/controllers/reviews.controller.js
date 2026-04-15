const Review = require('../models/review.model');

// GET /api/reviews -> listar todas 
exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find().sort({ date: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/reviews/:movieId -> listar por película 
exports.getReviewsByMovie = async (req, res) => {
    try {
        const reviews = await Review.find({ movieId: req.params.movieId }).sort({ date: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/reviews -> crear reseña (¡MODIFICADO!)
exports.createReview = async (req, res) => {

    // Datos del formulario
    const { movieId, movieTitle, text, rating } = req.body;

    let username;
    let userId = null;

    // req.user es adjuntado por el middleware 'optionalAuth' si el token es válido
    if (req.user) {
        // Usuario está logueado
        username = req.user.username; // Usamos el username del token (seguro)
        userId = req.user.id;         // Guardamos la referencia al usuario
    } else {
        // Usuario es anónimo
        username = req.body.username || 'Anónimo'; // Tomamos el username del form
    }

    const review = new Review({
        movieId,
        movieTitle,
        text,
        rating,
        username, // Asignamos el username (de token o de form)
        userId    // Asignamos el userId (o null si es anónimo)
    });

    try {
        const newReview = await review.save();
        res.status(201).json(newReview);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// PUT /api/reviews/:id -> editar reseña (Modificado para seguridad)
exports.updateReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Reseña no encontrada' });

        // --- Verificación de Permiso ---
        // Solo el usuario que creó la reseña puede editarla
        // (Asumimos que las reseñas anónimas no se pueden editar por ahora)
        if (!req.user || (review.userId && review.userId.toString() !== req.user.id)) {
            return res.status(403).json({ message: 'Acción no autorizada.' });
        }
        // --- Fin Verificación ---

        review.text = req.body.text || review.text;
        review.rating = req.body.rating || review.rating;

        const updatedReview = await review.save();
        res.json(updatedReview);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// DELETE /api/reviews/:id -> eliminar reseña (Modificado para seguridad)
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Reseña no encontrada' });

        // --- Verificación de Permiso ---
        if (!req.user || (review.userId && review.userId.toString() !== req.user.id)) {
            return res.status(403).json({ message: 'Acción no autorizada.' });
        }
        // --- Fin Verificación ---

        await review.remove();
        res.json({ message: 'Reseña eliminada' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};