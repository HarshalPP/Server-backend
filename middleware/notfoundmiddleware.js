exports.notFoundMiddleware = (req, res, next) => {
    try {
        res.status(404).json({ error: 'Route does not found' });
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
        next(error);
    }
};
