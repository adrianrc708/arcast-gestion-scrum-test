const User = require('../models/user.model');
const Review = require('../models/review.model');

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateMe = async (req, res) => {
    const { username } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        user.username = username || user.username;
        const updatedUser = await user.save();
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- WATCHLIST: Agregar ---
exports.addToWatchlist = async (req, res) => {
    const { movieId, contentType } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        // Convertir 'movie'/'tv' a 'Movie'/'TVShow' para Mongoose
        const modelName = contentType === 'tv' ? 'TVShow' : 'Movie';

        // Verificar si ya existe (comparamos IDs como strings)
        const exists = user.watchlist.find(w => w.item && w.item.toString() === movieId);
        if (exists) return res.status(400).json({ message: 'Ya está en tu watchlist.' });

        // Guardamos ID y Modelo
        user.watchlist.push({ item: movieId, kind: modelName });
        await user.save();
        res.json(user.watchlist);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- WATCHLIST: Obtener (Populate Corregido) ---
exports.getWatchlist = async (req, res) => {
    try {
        // 'watchlist.item' se refiere al campo 'item' dentro del array 'watchlist'
        const user = await User.findById(req.user.id).populate('watchlist.item');

        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        // Filtramos elementos nulos (por si se borró la película de la DB)
        const cleanWatchlist = user.watchlist.filter(w => w.item !== null);

        res.json({ watchlist: cleanWatchlist });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// --- WATCHLIST: Eliminar (Lógica Robusta) ---
exports.removeFromWatchlist = async (req, res) => {
    const { itemId } = req.params;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        // Filtramos quitando el elemento cuyo 'item' tenga el ID recibido
        // Nota: w.item puede ser un objeto (si se hizo populate antes) o un ID.
        // Usamos toString() para asegurar la comparación.
        user.watchlist = user.watchlist.filter(w => {
            const currentId = w.item._id ? w.item._id.toString() : w.item.toString();
            return currentId !== itemId;
        });

        await user.save();
        res.json({ message: 'Eliminado de la watchlist' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};