const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    }, 
     ProfileImage:{
      type:String
  }
    
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model("Cuisines", categorySchema);

module.exports = Category;
