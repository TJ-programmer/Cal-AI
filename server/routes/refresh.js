const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { User } = require("../models/user");

router.post('/', async (req, res) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) return res.status(401).send({ message: "No refresh token" });

        const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
        const user = await User.findById(decoded._id);
        if (!user) return res.status(401).send({ message: "User not found" });

        const newAccessToken = user.generateAuthToken(); 
        res.status(200).send({ accessToken: newAccessToken });
    } catch (error) {
        return res.status(401).send({ message: "Invalid or expired refresh token" });
    }
});

module.exports = router;
