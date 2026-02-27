const mongoose = require("mongoose");

module.exports = async () => {
    const connectionParams = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    };
    try {
        await mongoose.connect(process.env.DB, connectionParams);
        console.log("mongoDb connected successfully");
    } catch (error) {
        console.log(error);
        console.log("could not connect to DB");
    }
};