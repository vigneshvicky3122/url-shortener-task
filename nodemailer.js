const nodemailer = require("nodemailer");
require("dotenv").config();

async function mailer(Receiver, Otp) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAILER_ID,
      pass: process.env.MAILER_PASS,
    },
  });
  let info = await transporter.sendMail({
    from: process.env.MAILER_ID,
    to: Receiver,
    subject: "Get the link for reset your password",
    text: "Dear users! this is your OneTimePassword given below, Do not share your OTP keep maintaining for your security purpose.",
    html: "<a href=" + `${Otp}` + ">" + `${Otp}` + "</a>",
  });
  console.log("Message sent: %s", info.messageId);
  return;
}
module.exports = { mailer };
