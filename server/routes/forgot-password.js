const router = require("express").Router();
const { User } = require("../models/user");
const joi = require("joi");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

router.post("/", async (req, res) => {
    try {
        const schema = joi.object({
            email: joi.string().email().required().label("Email"),
        });
        const { error } = schema.validate(req.body);
        if (error)
            return res.status(400).send({ message: error.details[0].message });

        const user = await User.findOne({ email: req.body.email });

        if (!user)
            return res.status(401).send({ message: "Invalid email" });

        const token = jwt.sign({ _id: user._id }, process.env.SESSIONKEY, { expiresIn: '1d' })
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.USER,
                pass: process.env.PASS
            }
        });

        let mailOptions = {
            from: process.env.USER,
            to: user.email,
            subject: 'Reset your password',
            text: `http://localhost:5173/reset-password/${user._id}/${token}`
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                return res.status(500).send({ message: "Error sending email" });
            } else {
                return res.send({ status: "success" });
            }
        });
    } catch (error) {
        return res.status(500).send({ message: "Internal Server error" });
    }
});

module.exports = router;