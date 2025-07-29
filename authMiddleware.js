require('dotenv').config()
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY;


function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ msg: 'Unauthorized. No token provided.' });
    }

    try {

        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // attach user info to request
        next();
    } catch (err) {
        return res.status(403).json({ msg: 'Invalid or expired token.' });
    }
}

module.exports = verifyToken;
