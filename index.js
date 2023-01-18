const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const PORT = process.env.PORT || 8000;
const bodyParser = require("body-parser");

const { authentication, createToken } = require("./auth");
const { hashPassword, hashCompare } = require("./hashPassword");
const { mailer } = require("./nodemailer");
const { MongoClient, ObjectId } = require("mongodb");
const Client = new MongoClient(process.env.DB_URL);

app.use(
  bodyParser.json(),
  cors({
    origin: "*",
    credentials: true,
  })
);

app.get("/Dashboard", authentication, async function (req, res) {
  await Client.connect();
  try {
    let Db = Client.db(process.env.DB_NAME);
    let result = await Db.collection(process.env.DB_COLLECTION_ONE)
      .find()
      .toArray();

    if (result) {
      res.status(200).json({ result });
    } else {
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "internal server error" });
  } finally {
    await Client.close();
  }
});
app.post("/signup", async function (req, res) {
  await Client.connect();
  try {
    let Db = Client.db(process.env.DB_NAME);
    let hashedPassword = await hashPassword(req.body.password);
    let shortUrl = generateUrl();
    let verify = await Db.collection(process.env.DB_COLLECTION_ONE)
      .find({ email: req.body.email })
      .toArray();
    if (verify.length === 0) {
      let result = await Db.collection(process.env.DB_COLLECTION_ONE).insertOne(
        {
          name: req.body.name,
          email: req.body.email,
          username: req.body.username,
          password: hashedPassword,
          loginUrl:
            "https://url-shortener-web-apps.netlify.app/instagram/user/accounts/my_accounts/email/login",
          shortUrl: shortUrl,
          Active: false,
          clickCount: 0,
        }
      );

      if (result) {
        await mailer(
          req.body.email,
          `https://url-shortener-web-apps.netlify.app/a/${shortUrl}`
        );
        res.json({
          statusCode: 201,
          message:
            "Signup successful, please check & verify your email, get to login link",
        });
      }
    } else {
      res.json({
        statusCode: 401,
        message: "This user was already exists, try to another email address",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({ statusCode: 500, message: "internal server error" });
  } finally {
    await Client.close();
  }
});
app.post("/login", async function (req, res) {
  await Client.connect();
  try {
    let Db = Client.db(process.env.DB_NAME);
    let result = await Db.collection(process.env.DB_COLLECTION_ONE)
      .find({
        email: req.body.email,
        Active: true,
      })
      .toArray();

    if (result.length === 1) {
      if (await hashCompare(req.body.password, result[0].password)) {
        let token = await createToken(
          result[0].email,
          result[0].username,
          result[0].name
        );
        res.json({
          statusCode: 200,
          message: "login successful",
          token: token,
        });
      } else {
        res.json({ statusCode: 404, message: "invalid credentials" });
      }
    } else {
      res.json({
        statusCode: 405,
        message:
          "inactive user does not allowed this page , please active or left this page",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "internal server error" });
  } finally {
    await Client.close();
  }
});
app.get("/:id", async function (req, res) {
  await Client.connect();
  try {
    let Db = Client.db(process.env.DB_NAME);
    let result = await Db.collection(process.env.DB_COLLECTION_ONE)
      .find({ shortUrl: req.params.id })
      .toArray();
    if (result.length === 0) {
      res.json({
        statusCode: 401,
        message: "User does not exist, Please Register",
      });
    } else {
      let Active = await Db.collection(process.env.DB_COLLECTION_ONE).updateOne(
        { _id: ObjectId(result[0]._id) },
        { $set: { Active: true }, $inc: { clickCount: 1 } }
      );
      if (Active) {
        res.json({
          statusCode: 202,
          message: "Account activated",
          Url: result[0].loginUrl,
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "internal server error" });
  } finally {
    await Client.close();
  }
});
app.get("/delete/:id", authentication, async function (req, res) {
  await Client.connect();
  try {
    let Db = Client.db(process.env.DB_NAME);
    let result = await Db.collection(process.env.DB_COLLECTION_ONE).deleteOne({
      _id: ObjectId(req.params.id),
    });

    if (result) {
      res.status(200).json({ message: "User deleted" });
    } else {
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "internal server error" });
  } finally {
    await Client.close();
  }
});
app.post("/reset-email-verify", async function (req, res) {
  await Client.connect();

  try {
    const Db = Client.db(process.env.DB_NAME);

    let user = await Db.collection(process.env.DB_COLLECTION_ONE)
      .find({ email: req.body.email })
      .toArray();
    if (user.length === 1) {
      let digits = "123456789";
      let OTP = "";
      for (let i = 0; i < 6; i++) {
        OTP += digits[Math.floor(Math.random() * 9)];
      }
      if (OTP) {
        await mailer(
          req.body.email,
          `https://url-shortener-web-apps.netlify.app/instagram/user/accounts/my_accounts/password-reset/password/${OTP}`
        );
        let saveOtp = await Db.collection(
          process.env.DB_COLLECTION_ONE
        ).findOneAndUpdate({ email: req.body.email }, { $set: { token: OTP } });
        if (saveOtp) {
          res.json({
            statusCode: 200,
            message:
              "Reset password link send your registered email, check and update your password",
          });
        }
      } else {
        res.json({
          statusCode: 401,
          message: "User does not exist,can't reset your password",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.json({
      statusCode: 500,
      message: "internal server error",
    });
  } finally {
    await Client.close();
  }
});

app.put("/password-reset/:id", async (req, res) => {
  await Client.connect();
  try {
    const Db = Client.db(process.env.DB_NAME);
    let users = await Db.collection(process.env.DB_COLLECTION_ONE)
      .find({ token: req.params.id })
      .toArray();
    if (users.length === 1) {
      if (req.body.password === req.body.confirmPassword) {
        let hashpassword = await hashPassword(req.body.password);

        if (hashpassword) {
          let reset = await Db.collection(
            process.env.DB_COLLECTION_ONE
          ).findOneAndUpdate(
            { email: users[0].email },
            { $set: { password: hashpassword } }
          );
          if (reset) {
            res.json({
              statusCode: 200,
              message: "Password changed successfully",
            });
            let disable = await Db.collection(
              process.env.DB_COLLECTION_ONE
            ).findOneAndUpdate(
              { email: users[0].email },
              { $unset: { token: req.params.id } }
            );
          }
        }
      } else {
        res.json({
          statusCode: 403,
          message: "Details does not match",
        });
      }
    } else {
      res.json({
        statusCode: 401,
        message: "invalid Otp, Retry",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      statusCode: 500,
      message: "internal server error",
    });
  } finally {
    await Client.close();
  }
});
app.listen(PORT, function () {
  console.log("server is running into port " + PORT);
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
