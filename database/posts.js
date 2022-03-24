const mongoose = require("mongoose")

const postSchema = new mongoose.Schema({
    post_text: {type:String,required:true},
    image: {data:Buffer,contentType:String}
})

const post = mongoose.model("posts",postSchema)

module.exports = post