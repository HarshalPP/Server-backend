// const AWS = require("aws-sdk");

// const awsConfig = {
//   accessKeyId: process.env.AWS_ACCESS_KEY,
//   secretAccessKey: process.env.AWS_SECRET_KEY,
//   region: process.env.REGION,
// };

// const SES = new AWS.SES(awsConfig);
// const sendEmail = async (options) => {
//   try {
//     const mailOptions = {
//       Source: options.from,
//       Destination: {
//         ToAddresses: [options.to],
//       },
//       Message: {
//         Subject: {
//           Data: options.subject,
//         },
//         Body: {
//           Html: {
//             Data: options.text,
//           },
//         },
//       },
//     };

//     return await SES.sendEmail(mailOptions).promise(); // Utilize promise method
//   } catch (error) {
//     console.log(error);
//     throw new Error("Failed to send email");
//   }
// };

// module.exports = sendEmail;


/// Use A Nodemailer // 

const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables from .env file if using environment variables

// Nodemailer Connection
const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true, // Use SSL/TLS
  auth: {
    user: process.env.CLIENT_EMAIL,
    pass: process.env.CLIENT_EMAIL_PASSWORD,
  },
});

const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: process.env.CLIENT_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.text,
    };


    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = sendEmail;
