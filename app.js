require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
const multer = require('multer');

const app = express();

// -------------------- BODY PARSERS --------------------
// Parse HTML form data (for login/signup/home forms)
app.use(express.urlencoded({ extended: true }));
// Parse JSON requests (for APIs if needed)
app.use(express.json());

// -------------------- VIEW ENGINE --------------------
app.set('view engine', 'ejs');
app.set('views', 'views');

// -------------------- ENV --------------------
const DB_PATH = process.env.MONGO_URL;
const PORT = process.env.PORT || 10000;

// -------------------- SESSION STORE --------------------
const store = new MongoDBStore({
  uri: DB_PATH,
  collection: 'sessions'
});

// -------------------- SESSION --------------------
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

// -------------------- STATIC FILES --------------------
const rootDir = require('./utils/pathUtil');
app.use(express.static(path.join(rootDir, 'public')));

// -------------------- LOCALS --------------------
app.use((req, res, next) => {
  res.locals.isLoggedIn = !!req.session.isLoggedIn;
  res.locals.user = req.session.user || null;
  next();
});

// -------------------- AUTH MIDDLEWARE --------------------
const isAuth = (req, res, next) => {
  if (!req.session.isLoggedIn) return res.redirect('/login');
  next();
};

// -------------------- MULTER SETUP --------------------
// Use memoryStorage for Cloudinary
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
const upload = multer({ storage, fileFilter });

// -------------------- ROUTERS --------------------
const authRouter = require('./routes/authRouter');
const storeRouter = require('./routes/storeRouter');
const hostRouter = require('./routes/hostRouter');

// Login/Signup routes (no file upload)
app.use(authRouter);

// Store routes (no file upload)
app.use(storeRouter);

// Host routes (attach multer only to routes that need file upload)
app.use('/host', isAuth, (req, res, next) => {
  next();
});
app.post('/host/add-home', isAuth, upload.single('photo'), require('./controllers/hostController').postAddHome);
app.post('/host/edit-home', isAuth, upload.single('photo'), require('./controllers/hostController').postEditHome);
app.use('/host', isAuth, hostRouter); // other host routes like host-home-list, delete-home, etc.

// -------------------- 404 --------------------
const errorsController = require('./controllers/errors');
app.use(errorsController.pageNotFound);

// -------------------- DB + SERVER --------------------
mongoose.connect(DB_PATH)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () =>
      console.log(`🚀 Server running on port http://localhost:${PORT}`)
    );
  })
  .catch(err => console.error("❌ Mongo Error:", err));
