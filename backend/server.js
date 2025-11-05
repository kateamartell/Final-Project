import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const app = express();
const PORT = process.env.PORT || 3000;

const users = [];
const comments = [];


// Middleware
app.engine("hbs", engine({ extname: ".hbs", defaultLayout: "main"}));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true}));
app.use(express.json());
app.use(cookieParser());
app.use (session({
    secret: "insecuresecret",
    resave: false,
    saveUninitialized: true
}));

function requireLogin(req, res, next){
    if (!req.session.user){
        return res.redirect("/login");
    }
    next();
}

app.get("/", (req, res) => {
    res.render("home", {user: req.session.user});
});

app.get("/register", (req,res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    const {username, password} = req.body;

    if (users.find(u =>u.username === username)){
        return res.render("register", {error: "Username already taken"});
    }
    users.push({username, password});
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const {username, password} =req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (!user){
        return res.render("login", {error: "Invalid Login"});
    }
    req.session.user = {username};
    res.cookie("session", JSON.stringify(req.session.user), {httpOnly: true});
    res.redirect("/");
});

app.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("session");
        res.redirect("/");
    });
});

app.get("/comments", (req, res) => {
    res.render("comments", {user: req.session.uder, comments});
});

app.get("/comment/new", requireLogin, (req, res) =>{
    res.render("newComment", {user: req.session.user});
});

app.post("/comment", requireLogin, (res, req) => {
    const {text} = req.body;
    comments.push({
        author: req.session.user.username,
        text,
        createdAt: new Date ()
    });
    res.redirect("/comments");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});