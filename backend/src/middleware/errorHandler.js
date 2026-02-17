const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.errors.map(e => ({ field: e.path, message: e.message })),
        });
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            error: 'Duplicate Entry',
            details: err.errors.map(e => ({ field: e.path, message: `${e.path} already exists` })),
        });
    }

    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ error: 'Referenced record not found' });
    }

    if (err.status) {
        return res.status(err.status).json({ error: err.message });
    }

    res.status(500).json({ error: 'Internal Server Error' });
};

module.exports = errorHandler;
