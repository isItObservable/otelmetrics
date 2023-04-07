const mongoose = require("mongoose");


const connectDB = async () => {
  try {

    console.log("getting mong uri");
    console.log(process.env.MONGO_URI)

    const conn = await mongoose.connect(process.env.MONGO_URI,{
                  authSource: "admin",
                  user: process.env.MONGO_USER,
                  pass: process.env.MONGO_PASS,
                  useNewUrlParser: true,
                  useUnifiedTopology: true,
              });

    console.log(`Mongo DB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;