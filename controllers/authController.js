const { check, validationResult } = require("express-validator");
const User = require("../models/user");
const bcrypt = require("bcryptjs");

/* ================= LOGIN PAGE ================= */
exports.getLogin = (req, res) => {
  res.render("auth/login", {
    pageTitle: "Login",
    currentPage: "login",
    errors: [],
    oldInput: { email: "" }
  });
};

/* ================= SIGNUP PAGE ================= */
exports.getSignup = (req, res) => {
  res.render("auth/signup", {
    pageTitle: "Signup",
    currentPage: "signup",
    errors: [],
    oldInput: { firstName: "", lastName: "", email: "", userType: "" }
  });
};

/* ================= POST SIGNUP ================= */
exports.postSignup = [
  // Validation checks
  check("firstName")
    .trim()
    .isLength({ min: 2 })
    .withMessage("First Name should be at least 2 characters long")
    .matches(/^[A-Za-z\s]+$/)
    .withMessage("First Name should contain only alphabets"),

  check("lastName")
    .matches(/^[A-Za-z\s]*$/)
    .withMessage("Last Name should contain only alphabets"),

  check("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),

  check("password")
    .isLength({ min: 8 })
    .withMessage("Password should be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password should contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password should contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password should contain at least one number")
    .matches(/[!@&]/)
    .withMessage("Password should contain at least one special character")
    .trim(),

  check("confirmPassword")
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  check("userType")
    .notEmpty()
    .withMessage("Please select a user type")
    .isIn(["guest", "host"])
    .withMessage("Invalid user type"),

  check("terms")
    .notEmpty()
    .withMessage("Please accept the terms and conditions"),

  // Signup controller
  async (req, res) => {
    const { firstName = "", lastName = "", email = "", password = "", userType = "" } = req.body || {};
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).render("auth/signup", {
        pageTitle: "Signup",
        currentPage: "signup",
        errors: errors.array().map(err => err.msg),
        oldInput: { firstName, lastName, email, userType }
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        userType
      });

      await user.save();
      res.redirect("/login");
    } catch (err) {
      return res.status(500).render("auth/signup", {
        pageTitle: "Signup",
        currentPage: "signup",
        errors: [err.message || "Something went wrong"],
        oldInput: { firstName, lastName, email, userType }
      });
    }
  }
];

/* ================= POST LOGIN ================= */
exports.postLogin = async (req, res) => {
  // Safe destructuring with fallback
  const { email = "", password = "" } = req.body || {};

  if (!email || !password) {
    return res.status(422).render("auth/login", {
      pageTitle: "Login",
      currentPage: "login",
      errors: ["Please provide both email and password"],
      oldInput: { email }
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(422).render("auth/login", {
        pageTitle: "Login",
        currentPage: "login",
        errors: ["User does not exist"],
        oldInput: { email }
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(422).render("auth/login", {
        pageTitle: "Login",
        currentPage: "login",
        errors: ["Invalid password"],
        oldInput: { email }
      });
    }

    // Save session
    req.session.isLoggedIn = true;
    req.session.user = {
      _id: user._id.toString(),
      email: user.email,
      userType: user.userType
    };

    req.session.save(err => {
      if (err) console.error("Session save error:", err);
      res.redirect("/");
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).render("auth/login", {
      pageTitle: "Login",
      currentPage: "login",
      errors: [err.message || "Something went wrong"],
      oldInput: { email }
    });
  }
};

/* ================= LOGOUT ================= */
exports.postLogout = (req, res) => {
  req.session.destroy(err => {
    if (err) console.error("Logout error:", err);
    res.redirect("/login");
  });
};
