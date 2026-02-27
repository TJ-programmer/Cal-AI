const router =require("express").Router();
const{User} =require("../models/user");
const joi=require("joi");
const bcrypt=require("bcrypt");
router.post('/',async (req,res) =>{
    try {
        const{error}=validate(req.body)
        if(error)
            return res.status(400).send({message:error.details[0].message});

        const user = await User.findOne({email:req.body.email});

        if(!user)
            return res.status(401).send({message:"Invalid email or password"});

        const validPassword=await bcrypt.compare(
            req.body.password,user.password
        );
        if(!validPassword)
            return res.status(401).send({message:"Invalid email or password"});

        const token=user.generateAuthToken();
        const refreshToken=user.generateRefreshToken();
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });
        res.status(200).send({data:token,message:"Login Successfull"});
    } catch (error) {
        res.status(500).send({message:"Internal Server error"});
    }
})

const validate=(data)=>{
    const schema=joi.object({
        email:joi.string().email().required().label("Email"),
        password:joi.string().required().label("Password")
    });
    return schema.validate(data);
}

module.exports=router;