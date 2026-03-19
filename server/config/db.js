const mongoose = require("mongoose");
const { mongoUri } = require("./env");

async function connectMongo() {
  await mongoose.connect(mongoUri, {
    autoIndex: true,
  });
}

module.exports = { connectMongo };

