"use strict";
const express = require("express");
const bcrypt = require("bcrypt");
const uuid = require("uuid").v4;
const session = require("express-session");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const { engine } = require("express-handlebars");
const validator = require("validator");

const app = express();
const PORT = 3000;
const saltRounds = 10;

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views");

app.use(express.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use(
  morgan(":method :url :status :response-time ms - :res[content-length]")
);
app.use(
  session({
    genid: (_req) => {
      return uuid();
    },
    resave: false,
    saveUninitialized: true,
    secret:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ",
  })
);

app.get("/", (_req, res) => {
  res.render("home");
});

app.get("/signin", (req, res) => {
  if (req.session.user) {
    res.redirect("/notes");
  }
  res.render("signin");
});

app.post("/login", (req, res) => {
  const { users } = require("./db");

  const { username, password } = req.body;
  const user = users.find((user) => {
    return user.username === username;
  });

  if (user) {
    const hash = user.password;
    bcrypt.compare(password, hash, (err, result) => {
      if (!result) res.redirect("/signin");
    });
  } else res.redirect("/signin");

  req.session.regenerate((err) => {
    if (err) next(err);
    req.session.user = user.username;
    req.session.save((err) => {
      if (err) next(err);
      res.redirect("/notes");
    });
  });
});

app.get("/signup", (req, res) => {
  if (req.session.user) {
    res.redirect("/notes");
  }
  res.render("signup");
});

app.post("/signup", (req, res, next) => {
  const { users } = require("./db");
  const { username, password } = req.body;
  // make sure username is a string of characters only
  if (!validator.isAlpha(username)) {
    return;
  }
  // password validation:
  // {
  // minLength: 8,
  // minLowercase: 1,
  // minUppercase: 1,
  // minNumbers: 1,
  // minSymbols: 1
  // }
  if (!validator.isStrongPassword(password)) {
    return;
  }
  // store the password hash not the password itself
  bcrypt.hash(password, saltRounds, (err, hash) => {
    users.push({ username, password: hash });
  });
  // sign user in and redirect to the notes page
  req.session.regenerate((err) => {
    if (err) next(err);
    req.session.user = username;
    req.session.save((err) => {
      if (err) next(err);
      res.redirect("/notes");
    });
  });
});

function isAuthenticated(req, res, next) {
  if (req.session.user) next();
  else {
    req.session.error = "Access denied";
    res.redirect("/signin");
  }
}

app.get("/logout", isAuthenticated, (req, res, next) => {
  req.session.user = null;
  req.session.save((err) => {
    if (err) next(err);
    // generate new session
    req.session.regenerate((err) => {
      if (err) next(err);
      res.redirect("/");
    });
  });
});

app.get("/notes", isAuthenticated, (req, res) => {
  const { notes } = require("./db");
  console.log(req.session);
  res.render("notes", {
    notes: notes,
  });
});

app.post("/notes", isAuthenticated, (req, res) => {
  const { notes } = require("./db");
  const { title, content } = req.body;
  if (title !== "" && content !== "") {
    const note = {
      id: uuid(),
      username: req.session.user,
      title: title,
      content: content,
      created: new Date().toISOString(),
    };
    notes.push(note);
  }
  res.render("notes", {
    notes,
  });
});

app.listen(PORT);
