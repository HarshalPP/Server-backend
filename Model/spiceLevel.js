const mongoose=require('mongoose');
const spiceLevelSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    ProfileImage:{
        type:String,
        required:true
    }
},{
    timestamps:true
})

const SpiceLevel=mongoose.model('SpiceLevel',spiceLevelSchema);

module.exports=SpiceLevel;