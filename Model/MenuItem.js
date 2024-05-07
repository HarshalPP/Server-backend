const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
    },
    weight:{
      type:Number,
    },
    portion_Size:{
      type:String,
    },
    Ingredients: {
      type: String,
    },

    Heating_Instruction:{
    type:String,
    },

    List_of_Ingredients:{
      type:String,
    },

    Cuisines_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cuisines"
    },

    Dishtype_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DishType"
    },

    Dietary_id:{
      type:mongoose.Schema.Types.ObjectId,
      ref:'Dietary'
    },
    spice_level_id:{
      type:mongoose.Schema.Types.ObjectId,
      ref:'SpiceLevel'
    },
    chef_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chef",
    },
    ProfileImage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const MenuItem = mongoose.model("MenuItem", menuItemSchema);

module.exports = MenuItem;
