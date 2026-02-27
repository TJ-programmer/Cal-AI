const mongoose=require("mongoose");
const jwt =require("jsonwebtoken");
const joi =require("joi");
const passwordComplexity =require("joi-password-complexity");
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    firstName: String,
    lastName: String,
    }, { timestamps: true });

userSchema.methods.generateAuthToken=function(){
    const token=jwt.sign({_id:this._id},process.env.SESSIONKEY,{expiresIn:'15m'})
    return token
}

userSchema.methods.generateRefreshToken=function(){
    const token=jwt.sign({_id:this._id},process.env.REFRESH_SECRET,{expiresIn:'7d'})
    return token
}

const User = mongoose.model("User", userSchema);

const complexityoption={
    min:8,
    max:30,
    lowerCase:1,
    upperCase:1,
    numeric:1,
    symbol:1,
    requirementCount:4,
};
const validate =(data)=>{
    const schema =joi.object({
        firstName:joi.string().required().label("First Name"),
        lastName:joi.string().required().label("Last Name"),
        email:joi.string().email().required().label("Email"),
        password:passwordComplexity(complexityoption).required().label("Password"),
    })
    return schema.validate(data)
};


module.exports={User,validate}

