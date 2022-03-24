const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))
app.use(cors());
const db = require('./database/config.js')
const routes = require('./router/router')
app.use("/",routes);

app.listen(4000,console.log("running on port 4000"));
