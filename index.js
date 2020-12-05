const express = require("express");
const mongodb = require("mongodb");
const cors = require('cors')
const bcrypt=require('bcrypt')
const nodemailer = require("nodemailer")
require('dotenv').config()

const mongoClient = mongodb.MongoClient;
const objectId = mongodb.ObjectID;

const app = express();
const dbURL = process.env.DB_URL ||"mongodb://127.0.0.1:27017";
const port = process.env.PORT || 3000

app.use(express.json());
app.use(cors())


app.get("/get-user/:id", async (req, res) => {
    try {
        let clientInfo = await mongoClient.connect(dbURL);
        let db = clientInfo.db("userRegistration");
        let data = await db.collection("user").findOne({
            _id: objectId(req.params.id)
        });
        res.status(200).json({data});
        clientInfo.close();
    } catch (error) {
        console.log(error);
        res.send(500);
    }
});

app.put("/update-user/:id", async (req, res) => {
    try {
        let clientInfo = await mongoClient.connect(dbURL);
        let db = clientInfo.db("userRegistration");
        let data = await db.collection("user").updateOne({
            _id: objectId(req.params.id)
        },{$set:req.body});
        res.status(200).json({message: "User updated"});
        clientInfo.close();
    } catch (error) {
        console.log(error);
        res.send(500);
    }
})

app.post("/register", async (req, res) => {
    try {
      let clientInfo = await mongoClient.connect(dbURL);
      let db = clientInfo.db("userRegistration");
      let result = await db
        .collection("user")
        .findOne({ email: req.body.email });
      if (result) {
        res.status(400).json({ message: "User already registered" ,icon :'warning'});
      } else {
        let salt = await bcrypt.genSalt(15);
        let hash = await bcrypt.hash(req.body.password, salt);
        req.body.password = hash;
        await db.collection("user").insertOne(req.body);
        res.status(200).json({ message: "User registered" ,icon :'success' });
        clientInfo.close();
      }
    } catch (error) {
      console.log(error);
    }
  })
  
  app.post("/login", async (req, res) => {
    try {
      let clientInfo = await mongoClient.connect(dbURL);
      let db = clientInfo.db("userRegistration");
      let result = await db
        .collection("user")
        .findOne({ email: req.body.email });
      if (result) {
        let isTrue = await bcrypt.compare(req.body.password, result.password);
        if (isTrue) {
          res.status(200).json({ message: "Logged in successfully" ,icon :'success'});
          clientInfo.close();
        } else {
          res.status(200).json({ message: "Incorrect Password" ,icon :'warning' });
        }
      } else {
        res.status(400).json({ message: "User not registered" ,icon :'warning' });
      }
    } catch (error) {
      console.log(error);
    }
  })

  app.post('/forgot',async (req,res)=>{
    try {
      let clientInfo = await mongoClient.connect(dbURL);
      let db = clientInfo.db("userRegistration");
      let result = await db.collection("user").findOne({ email: req.body.email })

      if (result) {
        let random=(Math.random()*1e32).toString(36)

        let transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false, 
          auth: {
            user: process.env.MAIL_USERNAME, 
            pass: process.env.MAIL_PASSWORD, 
          },
        })
        let info = await transporter.sendMail({
          from: `Mohamed Riyaz <${process.env.MAIL_USERNAME}>`, 
          to: `${req.body.email}`, 
          subject: "Password Reset", 
          text: "Reset your password", 
          html: `<b>Click below to reset your password</b><br> <a href='https://reset-password.netlify.app/new_password.html?random=${random}'>Reset</a>`
        })
        await db.collection("user").updateOne({ email: req.body.email },{$set:{'randomstring':random}});
        res.status(200).json({message: `Thanks! Please check ${req.body.email} for a link to reset your password.`,icon:'success'});
        clientInfo.close()
      }
      else{
        res.status(400).json({message: "User doesn't exists",icon:'warning'});
      }
    }
    catch(err){
      console.log(err);
    }
  })

  app.post('/reset',async(req,res)=>{
    try {
      let clientInfo = await mongoClient.connect(dbURL);
      let db = clientInfo.db("userRegistration");
      let result = await db.collection("user").findOne({randomstring : req.body.randomstring})
      if(result){
        let salt = await bcrypt.genSalt(15);
        let password = await bcrypt.hash(req.body.password, salt);
        await db.collection("user").updateOne({
        randomstring: req.body.randomstring}, {$set: {
                    randomstring: '',
                    password: password
                }})
        res.status(200).json({message: "Password Changed successfully" ,icon :'success'});
        clientInfo.close();
      }else{
        res.status(410).json({message: "some error in page" ,icon :'error'});
      }
  }
  catch(err){
    console.log(err);
  }
  })



app.listen(port, () => console.log("your app runs with port:",port));
