'use strict';
const express = require('express');
const bcrypt = require('bcrypt');
const uuid = require('uuid').v4;
const session = require('express-session');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const { engine } = require('express-handlebars');

const app = express();
const PORT = 3000;
const saltRounds = 10;

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use(morgan(':method :url :status :response-time ms - :res[content-length]'));
app.use(
  session({
    genid: _req => {
      return uuid();
    },
    resave: false,
    saveUninitialized: true,
    secret:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ',
  }),
);

app.get('/', (_req, res) => {
  res.render('home');
});

app.get('/signin', (req, res) => {
  if (req.session.user) {
    res.redirect('/notes');
  }
  res.render('signin');
});

app.post('/login', function (req, res) {
  const { users } = require('./db');
  const { username, password } = req.body;
  console.log(username, password);
  const user = users.filter(function (user) {
    return user.username === username;
  })[0];
  console.log(user);
  if (!user || user.password !== password) {
    throw Error('UNAUTHORIZED');
  }
  req.session.regenerate(function (err) {
    if (err) next(err);
    req.session.user = user.username;
    req.session.save(function (err) {
      if (err) return next(err);
      res.redirect('/notes');
    });
  });
});

app.get('/signup', (req, res) => {
  if (req.session.user) {
    res.redirect('/notes');
  }
  res.render('signup');
});

function isAuthenticated(req, res, next) {
  if (req.session.user) next();
  else {
    req.session.error = 'Access denied';
    res.redirect('/signin');
  }
}

app.get('/notes', isAuthenticated, (req, res) => {
  const { notes } = require('./db');
  console.log(req.session);
  res.render('notes', {
    notes: notes,
  });
});

app.listen(PORT);
