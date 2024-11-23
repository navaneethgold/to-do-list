const express = require("express");
const app = express();
require('dotenv').config();
const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');
const methodOverride=require("method-override");
const ejsMate= require("ejs-mate");
const passportLocalMongoose=require("passport-local-mongoose");
const passport=require("passport");
const localStrategy=require("passport-local");
const session=require("express-session");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.engine("ejs",ejsMate);
app.use(methodOverride("_method"));
app.set('view engine', 'ejs');
app.set('views', './views');
const sessionOptions={
    secret:process.env.SESSION,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires: Date.now() + 7*24*60*60*1000,  
        maxAge:7*24*60*60*1000,
    },
    httpOnly:true,
};
main().then(() => {
    console.log("connected successfully");  
}).catch((err) => {
    console.log("not connected");   
    console.log(err);
});

async function main() {
    const a =process.env.DB_URL
    await mongoose.connect(a);
}

const todoschema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    completed: {
        type: Boolean,  
        default: false
    },
    priority:{
        type:Number,
        default:3
    },
    id: {
        type: String,
        default: uuidv4,
    },
    username:{
        type:String,
        required:true
    }
});
const userSchema=new mongoose.Schema({
    email:{
        type:String,
        required:true
    }
})
userSchema.plugin(passportLocalMongoose);

const User=mongoose.model('User',userSchema);
const Todo = mongoose.model('Todo', todoschema);
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

let user_name="Not logged in";
app.get("/todos/newtodo", async (req, res) => {
    // const user=req.body.username;
    if(!req.isAuthenticated()){
        // alert("u should login before adding new todo");
        res.redirect("/login");
    }else{
        res.render("newtodo");
    }
});

app.post("/todos/newtodo", async (req, res) => {
    const newtodo = new Todo({
        title: req.body.task,
        username:user_name,
        priority:req.body.priority
    });
    await newtodo.save();
    res.redirect("/todos");
});
let toggle=0;
let button_val="show All tasks"
app.get("/todos", async (req, res) => {
    // if(!req.isAuthenticated()){
        // res.render("/signup");
    // }else{
        const alltasks = await Todo.find({});
        res.render("index", { alltasks,user_name,toggle,button_val });
    // }
    
});

app.post("/todos/:id/complete", async (req, res) => {
    const { id } = req.params;
    await Todo.findOneAndUpdate({ id: id }, { completed: true });
    res.redirect("/todos");
});
app.delete("/todos/:id",async(req,res)=>{
    const {id}= req.params;
    await Todo.findOneAndDelete({ id: id });
    res.redirect("/todos");
})


//users
app.get("/signup",async(req,res)=>{
    res.render("../views/users/signUp.ejs");
})
app.post("/signup",async(req,res)=>{
    // const username=req.body.username;
    // const email=req.body.email;
    // const password=req.body.password;
    let {username,email,password}=req.body;
    const newuser=new User({email,username});
    const userExists = await User.findOne({ username: username });
    if (userExists) {
        // Username already exists, handle it here (e.g., send an error response)
        return res.status(400).send("Username already exists!");
    }
    const registereduser=await User.register(newuser,password);
    req.logIn(registereduser,(err)=>{
        if(err){
            return next(err);
        }
        user_name=username;
        console.log(registereduser);
        res.redirect("/todos");
    })
    
})
app.post("/logout",async(req,res)=>{
    req.logOut((err)=>{
        if(err){
            return next(err);
        }
        user_name="Not logged in";
        res.redirect("/todos");
    });
    
})
app.get("/login",async(req,res)=>{
    res.render("../views/users/login.ejs");
})
app.post("/login",passport.authenticate("local",{failureRedirect:"/login"}),async(req,res)=>{
    user_name=req.body.username;
    res.redirect("/todos");
})
app.post("/toggle",async(req,res)=>{
    if(!req.isAuthenticated()){
        res.redirect("/login");
    }else{
        if(toggle==1){
            toggle=0;
            button_val="show all tasks"
        }else{
            toggle=1;
            button_val="show unaccomplished tasks"
        }
        res.redirect("/todos")
    }
    
})
app.post("/todos/:id/edit",async(req,res)=>{
    const {id}=req.params;
    const eTask=await Todo.findOne({id:id});
    console.log(eTask)
    res.render("edit.ejs",{eTask})
})

app.put("/todos/:id", async (req, res) => {
    const { id } = req.params;
    const title = req.body.entask;
    console.log(title);
    try {
        await Todo.findOneAndUpdate({ id: id }, { title: title });
        res.redirect("/todos");
    } catch (err) {
        console.error("Error updating task:", err);
        res.status(500).send("Internal Server Error");
    }
});
app.listen(8080, () => {
    console.log("I am listening on port 8080");
});

app.get("/", (req, res) => {
    res.send("hi");
});

