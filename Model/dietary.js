const mongoose = require("mongoose");

// Define the dietary schema
const dietarySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },  
    
    ProfileImage:{
        type:String
    },
  },
  {
    timestamps: true,
  }
);

const Dietary = mongoose.model("Dietary", dietarySchema);
module.exports = Dietary;

// Path: Food-delevery/Online-Ordering-Website/client/server/Model/menu.js