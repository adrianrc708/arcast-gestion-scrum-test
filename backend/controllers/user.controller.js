const User = require('../models/user.model');
const Review = require('../models/review.model');
const Movie = require('../models/movie.model');   // Importante
const TVShow = require('../models/tvshow.model'); // Importante

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

// --- WATCHLIST: Agregar (Detección Automática) ---
exports.addToWatchlist = async (req, res) => {
    const { movieId } = req.body; // Ignoramos contentType, lo detectamos nosotros
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        // 1. Verificar si ya existe (Evitar duplicados)
        const exists = user.watchlist.find(w => w.item && w.item.toString() === movieId);
        if (exists) return res.status(400).json({ message: 'Ya está en tu watchlist.' });

        // 2. Detectar si es Película o Serie buscando en la BD
        const isMovie = await Movie.exists({ _id: movieId });
        const isTVShow = await TVShow.exists({ _id: movieId });

        let validKind = null;
        if (isMovie) validKind = 'Movie';
        else if (isTVShow) validKind = 'TVShow';
        else return res.status(404).json({ message: 'Contenido no encontrado en la base de datos.' });

        // 3. Guardar con el tipo correcto
        user.watchlist.push({ item: movieId, kind: validKind });
        await user.save();

        res.json(user.watchlist);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// --- WATCHLIST: Obtener (Versión "Búsqueda Manual" solicitada) ---
exports.getWatchlist = async (req, res) => {
    try {
        // 1. Obtenemos el usuario SIN populate para tener los IDs crudos
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        const finalWatchlist = [];

        // 2. Recorremos cada item de la watchlist manualmente
        for (const entry of user.watchlist) {
            const itemId = entry.item; // Este es el ID (ej: 691ea0...)

            // A. Intentamos buscarlo en PELÍCULAS
            let foundData = await Movie.findById(itemId);
            let realKind = 'Movie';

            // B. Si no existe, lo buscamos en SERIES
            if (!foundData) {
                foundData = await TVShow.findById(itemId);
                realKind = 'TVShow';
            }

            // C. Si encontramos datos (sea peli o serie), lo agregamos a la lista final
            if (foundData) {
                finalWatchlist.push({
                    _id: entry._id, // ID de la entrada en la lista
                    kind: realKind, // El tipo real que encontramos
                    item: foundData // El objeto completo con titulo, foto, etc.
                });
            }
            // Si foundData sigue siendo null, significa que el contenido se borró de la BD, así que lo ignoramos.
        }

        res.json({ watchlist: finalWatchlist });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// --- WATCHLIST: Eliminar ---
exports.removeFromWatchlist = async (req, res) => {
    const { itemId } = req.params;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        // Filtro robusto: funciona si item es objeto (populate) o string (id)
        user.watchlist = user.watchlist.filter(w => {
            if (!w.item) return false; // Eliminar basura si la hay
            const currentId = w.item._id ? w.item._id.toString() : w.item.toString();
            return currentId !== itemId;
        });

        await user.save();
        res.json({ message: 'Eliminado de la watchlist' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};