var express=require('express');
var app=express();
var upload=require('express-fileupload');
const fs = require('fs');
const csv = require('csv-parser');
var alert=require("alert-node");
var myModule = require('./tinyurl-bulk');
var socketio = require('socket.io');
var express = require('express');
var dl= require('delivery');
let x=null;
let value=null;
app.use(upload());
app.get('/',function(req,res){
  res.sendfile('inter.html');
  })

app.post('/',function(req,res){
  if(req.files){
    var file=req.files.filename;
    var filename1=file.name;
    file.mv("./upload/"+filename1,function(err){
      if(err){
        console.log("err");
        res.send("error occured");
      }
      else{
        console.log("uploaded")
         console.log(filename1)
       value=myModule.hello(filename1);
        console.log("out");
      };
     });
   }
});
app.listen(3080);
console.log('server running on port 3080');
