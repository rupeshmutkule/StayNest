const Home = require("../models/home");
const User = require("../models/user");
const Booking = require("../models/booking");

/* ================= INDEX ================= */
exports.getIndex = async (req, res) => {
  try {
    const homes = await Home.find();
    res.render("store/index", {
      registeredHomes: homes,
      pageTitle: "Airbnb Home",
      currentPage: "index"
    });
  } catch (err) {
    console.log(err);
  }
};

/* ================= HOME LIST ================= */
exports.getHomes = async (req, res) => {
  try {
    const homes = await Home.find();
    res.render("store/home-list", {
      registeredHomes: homes,
      pageTitle: "Homes List",
      currentPage: "Home"
    });
  } catch (err) {
    console.log(err);
  }
};

/* ================= BOOKINGS ================= */
exports.getBookings = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const bookings = await Booking.find({
      user: req.session.user._id,
      status: "confirmed"
    }).populate("home");

    res.render("store/bookings", {
      pageTitle: "My Bookings",
      currentPage: "bookings",
      bookings
    });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

/* ================= BOOK A HOME ================= */
exports.postBooking = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const { homeId, checkIn, checkOut } = req.body;
    const home = await Home.findById(homeId);
    if (!home) return res.redirect("/homes");

    const nights = (new Date(checkOut) - new Date(checkIn)) / (1000*60*60*24);
    if (nights <= 0) return res.redirect(`/homes/${homeId}`);

    const totalPrice = nights * home.price;

    const booking = new Booking({
      user: req.session.user._id,
      home: homeId,
      checkIn,
      checkOut,
      totalPrice
    });

    await booking.save();
    res.redirect("/bookings");
  } catch (err) {
    console.log("Booking error:", err);
    res.redirect("/");
  }
};

/* ================= CANCEL BOOKING ================= */
exports.postCancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.redirect("/bookings");
    if (booking.user.toString() !== req.session.user._id) return res.redirect("/bookings");

    booking.status = "cancelled";
    await booking.save();
    res.redirect("/bookings");
  } catch (err) {
    console.log("Cancel booking error:", err);
    res.redirect("/bookings");
  }
};

/* ================= FAVOURITES ================= */
exports.getFavouriteList = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const user = await User.findById(req.session.user._id).populate("favourites");

    res.render("store/favourite-list", {
      favouriteHomes: user.favourites,
      pageTitle: "My Favourites",
      currentPage: "favourites"
    });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.postAddToFavourite = async (req, res) => {
  try {
    const homeId = req.body.id;
    const user = await User.findById(req.session.user._id);

    if (!user.favourites.includes(homeId)) {
      user.favourites.push(homeId);
      await user.save();
    }

    res.redirect("/favourites");
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.postRemoveFromFavourite = async (req, res) => {
  try {
    const homeId = req.params.homeId;
    const user = await User.findById(req.session.user._id);

    user.favourites = user.favourites.filter(favId => favId.toString() !== homeId);
    await user.save();
    res.redirect("/favourites");
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

/* ================= HOME DETAILS ================= */
exports.getHomeDetails = async (req, res) => {
  try {
    const home = await Home.findById(req.params.homeId);
    if (!home) return res.redirect("/homes");

    res.render("store/home-detail", {
      home,
      pageTitle: "Home Detail",
      currentPage: "Home"
    });
  } catch (err) {
    console.log(err);
    res.redirect("/homes");
  }
};
