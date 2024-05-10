const mongoose = require("mongoose");

//Define DishType schema

const dishTypeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    ProfileImage: {
        type: String,
        required: true,
    },
},{
    timestamps: true,

})

const DishType = mongoose.model("DishType", dishTypeSchema);

module.exports = DishType;
