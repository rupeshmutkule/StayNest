const Home = require("../models/home");
const cloudinary = require("../utils/cloudinary");
const streamifier = require("streamifier");

// Helper: upload buffer to Cloudinary
async function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "staynest" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// -------------------- GET ADD HOME --------------------
exports.getAddHome = (req, res) => {
  res.render("host/edit-home", {
    pageTitle: "Add Home",
    currentPage: "addHome",
    editing: false,
    home: {},
  });
};

// -------------------- POST ADD HOME --------------------
exports.postAddHome = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(422).render("host/edit-home", {
        pageTitle: "Add Home",
        currentPage: "addHome",
        editing: false,
        home: req.body,
        errors: ["Please upload an image (JPG, JPEG, PNG)"],
      });
    }

    const { houseName, price, location, rating, description } = req.body;

    // Upload image from memory buffer
    const result = await uploadToCloudinary(req.file.buffer);

    const home = new Home({
      houseName,
      price,
      location,
      rating,
      description,
      photo: result.secure_url,
      cloudinary_id: result.public_id,
    });

    await home.save();
    res.redirect("/host/host-home-list");
  } catch (err) {
    console.error("Add Home Error:", err);
    res.status(500).send("Internal Server Error");
  }
};

// -------------------- GET HOST HOMES --------------------
exports.getHostHomes = async (req, res) => {
  try {
    const registeredHomes = await Home.find();
    res.render("host/host-home-list", {
      registeredHomes,
      pageTitle: "Host Home List",
      currentPage: "host-homes",
    });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
};

// -------------------- GET EDIT HOME --------------------
exports.getEditHome = async (req, res) => {
  try {
    const home = await Home.findById(req.params.homeId);
    if (!home) return res.redirect("/host/host-home-list");

    res.render("host/edit-home", {
      pageTitle: "Edit Home",
      currentPage: "host-homes",
      editing: true,
      home,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/host/host-home-list");
  }
};

// -------------------- POST EDIT HOME --------------------
exports.postEditHome = async (req, res) => {
  try {
    const home = await Home.findById(req.body.id);
    if (!home) return res.redirect("/host/host-home-list");

    home.houseName = req.body.houseName;
    home.price = req.body.price;
    home.location = req.body.location;
    home.rating = req.body.rating;
    home.description = req.body.description;

    if (req.file) {
      // Delete old image
      if (home.cloudinary_id) {
        await cloudinary.uploader.destroy(home.cloudinary_id);
      }

      // Upload new image from buffer
      const result = await uploadToCloudinary(req.file.buffer);
      home.photo = result.secure_url;
      home.cloudinary_id = result.public_id;
    }

    await home.save();
    res.redirect("/host/host-home-list");
  } catch (err) {
    console.error("Edit Home Error:", err);
    res.status(500).send("Internal Server Error");
  }
};

// -------------------- DELETE HOME --------------------
exports.postDeleteHome = async (req, res) => {
  try {
    const home = await Home.findById(req.params.homeId);

    if (home && home.cloudinary_id) {
      await cloudinary.uploader.destroy(home.cloudinary_id);
    }

    await Home.findByIdAndDelete(req.params.homeId);
    res.redirect("/host/host-home-list");
  } catch (err) {
    console.error("Delete Home Error:", err);
    res.status(500).send("Internal Server Error");
  }
};
