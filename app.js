require('dotenv').config(); // Load environment variables from .env
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
const multer = require('multer');

// Routers
const storeRouter = require("./routes/storeRouter");
const hostRouter = require("./routes/hostRouter");
const authRouter = require("./routes/authRouter");

// Utilities & Controllers
const rootDir = require("./utils/pathUtil");
const errorsController = require("./controllers/errors");

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

// ✅ MONGO CONNECTION STRING
const DB_PATH = process.env.MONGO_URL;

// ✅ SESSION STORE
const store = new MongoDBStore({
  uri: DB_PATH,
  collection: 'sessions'
});

// Multer setup
const randomString = length => {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, randomString(10) + '-' + file.originalname)
});

const fileFilter = (req, file, cb) => {
  if (['image/jpg', 'image/jpeg', 'image/png'].includes(file.mimetype)) cb(null, true);
  else cb(null, false);
};

app.use(express.urlencoded({ extended: true }));
app.use(multer({ storage, fileFilter }).single('photo'));
app.use(express.static(path.join(rootDir, 'public')));
app.use('/uploads', express.static(path.join(rootDir, 'uploads')));
app.use('/host/uploads', express.static(path.join(rootDir, 'uploads')));
app.use('/homes/uploads', express.static(path.join(rootDir, 'uploads')));
app.use('/favourites/uploads', express.static(path.join(rootDir, 'uploads')));
app.use('/bookings/uploads', express.static(path.join(rootDir, 'uploads')));

// ✅ SESSION CONFIG
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 }
}));

// ✅ AUTH MIDDLEWARE
const isAuth = (req, res, next) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  next();
};

// ✅ LOCALS
app.use((req, res, next) => {
  res.locals.isLoggedIn = !!req.session.isLoggedIn;
  res.locals.user = req.session.user || null;
  next();
});

// ✅ ROUTES
app.use(authRouter);
app.use(storeRouter);
app.use("/host", isAuth, hostRouter);

// ✅ 404
app.use(errorsController.pageNotFound);

// ✅ PORT
const PORT = process.env.PORT || 3003;

// ✅ CONNECT TO MONGO AND START SERVER
mongoose.connect(DB_PATH)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.log('Mongo connection error:', err));
