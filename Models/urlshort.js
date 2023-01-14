const mongoose = require("mongoose");

const MongooseSchema = mongoose.Schema({
  longUrl: {
    type: String,
    required: true,
  },
  shortUrl: {
    type: String,
    unique: true,
  },
  clickCount: {
    type: Number,
    default: 0,
  },
});
const MongooseModel = mongoose.model("urlShort", MongooseSchema);
module.exports = { MongooseModel };
