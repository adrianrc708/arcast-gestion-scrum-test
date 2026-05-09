const User = require('../models/user.model');
const Review = require('../models/review.model');

// Obtener datos del usuario logueado (para pág. "Account")
exports.getMe = async (req, res) => {
    try {
        // req.user.id viene del middleware 'requiredAuth'
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Actualizar datos del usuario (para pág. "Account")
exports.updateMe = async (req, res) => {
    const { username, email } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        user.username = username || user.username;
        user.email = email || user.email;

        // (Opcional: agregar lógica para cambiar contraseña)

        const updatedUser = await user.save();
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Obtener todas las reseñas del usuario logueado (para pág. "Profile")
exports.getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// ... (imports y funciones getMe/updateMe/getMyReviews siguen igual) ...

// --- MODIFICADO: Agregar a Watchlist (Soporta Cine y TV) ---
exports.addToWatchlist = async (req, res) => {
    const { movieId, contentType } = req.body; // contentType debe ser 'movie' o 'tv'

    try {
        const user = await User.findById(req.user.id);

        // Convertir 'movie'/'tv' a los nombres de los Modelos ('Movie'/'TVShow')
        const modelName = contentType === 'tv' ? 'TVShow' : 'Movie';

        // Verificar duplicados
        const exists = user.watchlist.find(w => w.item.toString() === movieId);
        if (exists) {
            return res.status(400).json({ message: 'Ya está en tu watchlist.' });
        }

        // Guardar con el tipo correcto
        user.watchlist.push({ item: movieId, kind: modelName });
        await user.save();
        res.json(user.watchlist);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- MODIFICADO: Obtener Watchlist (Populate dinámico) ---
exports.getWatchlist = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('watchlist.item');
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        // Limpiamos items nulos (por si se borró la peli de la DB)
        const cleanWatchlist = user.watchlist.filter(w => w.item !== null);

        res.json({ watchlist: cleanWatchlist });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- NUEVA FUNCIÓN: Eliminar de Watchlist ---
exports.removeFromWatchlist = async (req, res) => {
    const { itemId } = req.params; // ID del elemento a borrar
    try {
        const user = await User.findById(req.user.id);

        // Filtramos para quitar el item
        user.watchlist = user.watchlist.filter(w => w.item.toString() !== itemId);

        await user.save();
        res.json({ message: 'Eliminado de la watchlist' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};