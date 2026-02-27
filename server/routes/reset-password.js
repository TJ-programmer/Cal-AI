const router = require("express").Router();
const {User}= require("../models/user");
const joi = require("joi");
const jwt = require("jsonwebtoken");
const bcrypt =require("bcrypt");

router.post("/:id/:token", async (req, res) => {
    try {
        const schema = joi.object({
            password: joi.string().min(8).required().label("Password"),
        });
        const { error } = schema.validate(req.body);
        
        if (error) {
            return res.status(400).send({ message: error.details[0].message });
        }

        const {id, token} = req.params;
        const {password} = req.body;
        
        jwt.verify(token, process.env.SESSIONKEY, (err, decoded) => {
            if(err){
                return res.status(409).send({message:"Error with token"});
            }
            else{
                bcrypt.hash(password, Number(process.env.SALT))
                .then(hash => {
                    User.findByIdAndUpdate({_id: id}, {password: hash})
                    .then(u => {
                        if (!u) {
                            return res.status(404).send({ message: "User not found" });
                        }
                        res.send({status: "success"});
                    })
                    .catch(err => res.status(500).send({ message: "Error updating user" }));
                })
                .catch(err => res.status(500).send({ message: "Error hashing password" }));
            }
        });

    } catch (error) {
        return res.status(500).send({ message: "Internal Server error" });
    }
});

module.exports = router;