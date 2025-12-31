const Home = require("../models/home");
const fs=require('fs');
// GET - Add Home Page
exports.getAddHome = (req, res) => {
  res.render("host/edit-home", {
    pageTitle: "Add Home",
    currentPage: "addHome",
    editing: false,
    home: {},
  });
};

// POST - Add Home
exports.postAddHome = async (req, res) => {
  try {
    const { houseName, price, location, rating, description } = req.body;
    console.log("Received file:", req.file);
    const photo=req.file.path;
    if (!req.file) {
      res.status(422).send("Not valid image format. Only JPG, JPEG, PNG allowed.");
    }
    
    const home = new Home({
      houseName,
      price,
      location,
      rating,
      photo,
      description,
    });

    await home.save();
    console.log("Home saved successfully");

    // Redirect to host home list
    res.redirect("/host/host-home-list");
  } catch (err) {
    console.log("Error while adding home:", err);
    res.status(422).render("host/edit-home", {
      pageTitle: "Add Home",
      currentPage: "addHome",
      editing: false,
      home: req.body,
      errors: [err.message],
    });
  }
};

// GET - Host Home List
exports.getHostHomes = async (req, res) => {
  try {
    const registeredHomes = await Home.find();
    res.render("host/host-home-list", {
      registeredHomes,
      pageTitle: "Host Home List",
      currentPage: "host-homes",
    });
  } catch (err) {
    console.log("Error fetching homes:", err);
    res.redirect("/");
  }
};

// GET - Edit Home
exports.getEditHome = async (req, res) => {
  const homeId = req.params.homeId;
  const editing = req.query.editing === "true";

  try {
    const home = await Home.findById(homeId);
    if (!home) return res.redirect("/host/host-home-list");

    res.render("host/edit-home", {
      pageTitle: "Edit Home",
      currentPage: "host-homes",
      editing,
      home,
    });
  } catch (err) {
    console.log("Error fetching home:", err);
    res.redirect("/host/host-home-list");
  }
};

// POST - Edit Home
exports.postEditHome = async (req, res) => {
  try {
    const { id, houseName, price, location, rating, description } = req.body;

    const numericPrice = Number(price.toString().replace(/,/g, ''));
    const numericRating = Number(rating);

    const home = await Home.findById(id);
    if (!home) return res.redirect("/host/host-home-list");

    home.houseName = houseName;
    home.price = numericPrice;
    home.location = location;
    home.rating = numericRating;
    home.description = description;
    if(req.file){
      fs.unlink(home.photo,(err)=>{
        if(err){
          console.log("Error while deleting old image:",err);
        }
      })
       home.photo=req.file.path
      
    }

    await home.save();
    console.log("Home updated successfully");

    res.redirect("/host/host-home-list");
  } catch (err) {
    console.log("Error updating home:", err);
    res.redirect("/host/host-home-list");
  }
};

// POST - Delete Home
exports.postDeleteHome = async (req, res) => {
  const homeId = req.params.homeId;
  try {
    await Home.findByIdAndDelete(homeId);
    console.log("Home deleted successfully");
    res.redirect("/host/host-home-list");
  } catch (err) {
    console.log("Error deleting home:", err);
    res.redirect("/host/host-home-list");
  }
};
