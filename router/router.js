const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")
const mongoose = require("mongoose")
const crypto = require("crypto")
const multer = require("multer")
const path = require("path")
const {GridFsStorage} = require("multer-gridfs-storage")
const Grid = require("gridfs-stream")
const {generatteToken,authenticateToken} = require('../middleware/jwt')
const users = require("../database/user")
const requ = require('../database/requests')
const posts = require("../database/posts.js")

// ****************************************************************
// USER ROUTES
// ****************************************************************

// user signup
router.post("/signup",async (req,res)=>{
    try{
        if(req.body.name === undefined || req.body.email === undefined || req.body.password === undefined){
            res.send("name, email and password required")
        }else{
        const pass = await bcrypt.hash(req.body.password, 10);
        const userr = new users({
        name:req.body.nmae,
        password:pass,
        email:req.body.email,
        })
        const data = await users.insertMany(userr)
        console.log("signup succcesfull")
        res.send("signup succesfull")
    }
    }
    catch(err){
        res.send(err)
        console.log(err)
    }
})

// user signin
router.post("/signin",async(req,res)=>{
    try{
        const userdata = await users.findOne({email:req.body.email})
        if(userdata){
            const compare = await bcrypt.compareSync(req.body.password,userdata.password)
            if(compare){
                const token = generatteToken(req.body)
                res.send(token)
                console.log("login succesfull",token)
            }else{
                console.log("wrong password entered")
                res.send("wrong password entered")
            }
        }else{
            res.send("user not found")
            console.log("user not found")
        }
    }
    catch(err){
        res.send(err)
        console.log(err)
    }
})

// get all users
router.get("/user",authenticateToken,async(req,res)=>{
    try {
    const data = await users.find()
    console.log(data)
    res.send(data)
    } catch (error) {
    console.log(error)
    res.send({error: error.message})
    }
})


// ********************************************************************
//  friend requests routes
// ********************************************************************

// sending friend request
router.post("/request",authenticateToken,async(req, res)=>{
    try {
    const data = await requ.create(req.body)
    console.log("request send")
    res.send("requests send")
    } catch (error) {
    console.log(error)
    res.send({error: error.message})
    }
})


// see all friend requests
router.get("/request",authenticateToken,async(req,res)=>{
    try {
    const data = await requ.find()
    console.log(data)
    res.send(data)
    } catch (error) {
    console.log(error)
    res.send({error: error.message})
    }
})

// delete friend requests
router.delete("/request/:_id",authenticateToken,async(req,res)=>{
    try {
    const data = await requ.findByIdAndDelete({_id: req.params._id})
    console.log("deleted")
    res.send("deleted")
    } catch (error) {
    console.log(error)
    res.send({error: error.message})
    }
})


// ********************************************************************
// POSTS ROUTES
// ********************************************************************
const mongoURI = "mongodb://localhost/quikie"
const conn = mongoose.createConnection(mongoURI);

// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname)
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });
const upload = multer({ storage });

// uploading images
// router.post("/",upload.single("img"),(req,res)=>{
//     res.json({file:req.file})
// })

router.post("/post",authenticateToken,upload.single("image"),async(req,res)=>{
    try {
      const data = new posts({
        post_text: req.body.post_text,
        image: req.file.image
      })
      await posts.insertMany(data)
      console.log("data added successfully")
      res.send("data added successfully")
    } catch (error) {
        res.send({error:error.message})
        console.log(error)
    }
    // res.json({file:req.file})
})



// getting images
router.get('/images',authenticateToken ,(req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files),console.log(files)
  });
});
// get all details

router.get('/all',authenticateToken,async(req, res, next)=>{
  try {
    gfs.files.find().toArray((err, files) => {
      // Check if files
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: 'No files exist'
        });
      }
      return res.json(files),console.log(files)
  })
  } catch (error) {
    res.send({error: error.message})
    console.log(error)
  }
})

// get single image

router.get('/files/:filename', authenticateToken,(req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file),console.log(file);
  });
});

// displaying image after retreiving it from database

router.get('/image/:filename', authenticateToken,(req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

// delete images by id

router.delete('/files/:filename', authenticateToken,(req, res) => {
  gfs.files.deleteOne({ filename: req.params.filename}, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.send("succesfully deleted")
    console.log("deleted")
  });
});

// deleting all images from database

router.delete('/files', authenticateToken,(req, res) => {
  gfs.files.deleteMany((err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.send("succesfully deleted")
    console.log("deleted")
  });
});

// get posts

router.get("/post",authenticateToken,async(req,res)=>{
  try {
  const data = await posts.find()
  console.log(data)
  res.send(data)
  } catch (error) {
  console.log(error)
  res.send({error: error.message})
  }
})

// delete post
router.delete("/post/:_id",authenticateToken,async(req,res)=>{
  try {
  const data = await posts.findByIdAndDelete({_id: req.params._id})
  console.log("deleted")
  res.send("deleted")
  } catch (error) {
  console.log(error)
  res.send({error: error.message})
  }
})

module.exports = router