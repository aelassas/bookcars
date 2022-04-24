import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.BC_JWT_SECRET;

const verifyToken = (req, res, next) => {
    const token = req.headers['x-access-token'];
    
    if (!token) {
        return res.status(403).send({ message: 'No token provided!' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(401).send({ message: 'Unauthorized!' });
        }
        
        req.userId = decoded.id;
        next();
    });
};

export default { verifyToken };