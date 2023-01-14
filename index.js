const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
mongoose.connect(
  "mongodb+srv://Wikky:wikky123@instagram.6ad5rgs.mongodb.net/?retryWrites=true&w=majority"
);
const { MongooseModel } = require("./Models/urlshort");

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.get("/", function (req, res) {
  MongooseModel.find(function (err, result) {
    if (err) {
      console.log(err);
    } else {
      res.render("UserInterface", {
        urlResult: result,
      });
    }
  });
});
app.post("/create", function (req, res) {
  let newURL = new MongooseModel({
    longUrl: req.body.longUrl,
    shortUrl: generateUrl(),
  });
  newURL.save(function (err, data) {
    if (err) throw err;

    res.redirect("/");
  });
});
app.get("/:urlId", function (req, res) {
  MongooseModel.findOne({ shortUrl: req.params.urlId }, function (err, data) {
    if (err) throw err;
    MongooseModel.findByIdAndUpdate(
      { _id: data._id },
      { $inc: { clickCount: 1 } },
      function (err, updatedData) {
        if (err) throw err;
        res.redirect(data.longUrl);
      }
    );
  });
});
app.get("/delete/:id", function (req, res) {
  MongooseModel.findOneAndDelete(
    { _id: req.params.id },
    function (err, deleteData) {
      if (err) throw err;
      res.redirect("/");
    }
  );
});
app.listen(8000, function (req, res) {
  console.log("server is running into port 8000");
});

function generateUrl() {
  let rndResults = "";
  let characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;

  for (let index = 0; index < 6; index++) {
    rndResults += characters.charAt(
      Math.floor(Math.random() * charactersLength)
    );
  }
  return rndResults;
}
