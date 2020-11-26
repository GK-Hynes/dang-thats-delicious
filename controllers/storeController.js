const mongoose = require("mongoose");
const Store = mongoose.model("Store");
const User = mongoose.model("User");
const multer = require("multer");
const jimp = require("jimp");
const uuid = require("uuid");

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith("image/");
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: "That filetype isn't allowed" }, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render("index");
};

exports.addStore = (req, res) => {
  res.render("editStore", { title: "Add Store" });
};

// Read images into memory
exports.upload = multer(multerOptions).single("photo");

exports.resize = async (req, res, next) => {
  // check if there is a new file
  if (!req.file) {
    next();
    return;
  }
  // Create unique filename
  const extension = req.file.mimetype.split("/")[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // Do the resizing
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  // Write photo to filesystem
  await photo.write(`./public/uploads/${req.body.photo}`);
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await new Store(req.body).save();
  req.flash(
    "success",
    `Successfully created ${store.name}. Care to leave a review?`
  );
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = page * limit - limit;

  // Query db for list of all stores
  const storesPromise = Store.find()
    .skip(skip)
    .limit(limit)
    .sort({ created: "desc" });

  const countPromise = Store.count();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  if (!stores.length && skip) {
    req.flash(
      "info",
      `Hey you asked for ${page}. But that doesn't exist. So here's ${pages}`
    );
    res.redirect(`/stores/page/${pages}`);
    return;
  }

  const pages = Math.ceil(count / limit);

  res.render("stores", { title: "Stores", stores, page, pages, count });
};

const confirmOwner = (req, res, store, user) => {
  if (!store.author.equals(user._id)) {
    req.flash("error", "You must own a store in order to edit it!");
    res.redirect("/");
  }
};

exports.editStore = async (req, res) => {
  // Find store based off id
  const store = await Store.findOne({ _id: req.params.id });
  // Confirm owner of store
  confirmOwner(req, res, store, req.user);
  // Render edit form
  res.render("editStore", { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
  // Set location data to be a point
  req.body.location.type = "Point";

  // Find and update store
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return new store, not old store
    runValidators: true
  }).exec();
  // Tell them if it was successful
  req.flash(
    "success",
    `Successfully updated <strong>${store.name}</strong>. <a href="/store/${store.slug}">View Store</a>`
  );
  // Redirect to store
  res.redirect(`/stores/${store.id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate(
    "author reviews"
  );
  if (!store) {
    return next();
  }
  res.render("store", { title: store.name, store });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

  res.render("tags", { tags, stores, tag, title: "Tags" });
};

exports.searchStores = async (req, res) => {
  const stores = await Store
    // First find stores that match
    .find(
      {
        $text: {
          $search: req.query.q
        }
      },
      {
        score: { $meta: "textScore" }
      }
    )
    // Then sort them by textScore
    .sort({
      score: { $meta: "textScore" }
    })
    // Limit to only 5 stores
    .limit(5);
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates
        },
        $maxDistance: 10000 // 10km
      }
    }
  };

  const stores = await Store.find(q)
    .select("slug name description location photo")
    .limit(10);
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render("map", { title: "map" });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map((obj) => obj.toString());
  const operator = hearts.includes(req.params.id) ? "$pull" : "$addToSet";

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      [operator]: { hearts: req.params.id }
    },
    { new: true }
  );
  res.json(user);
};

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    _id: { $in: req.user.hearts }
  });
  res.render("stores", { title: "Hearted Stores", stores });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render("topStores", { stores, title: "★ Top Stores" });
};
