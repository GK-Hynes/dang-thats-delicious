const mongoose = require("mongoose");
const Store = mongoose.model("Store");

exports.homePage = (req, res) => {
  res.render("index");
};

exports.addStore = (req, res) => {
  res.render("editStore", { title: "Add Store" });
};

exports.createStore = async (req, res) => {
  const store = await new Store(req.body).save();
  req.flash(
    "success",
    `Successfully created ${store.name}. Care to leave a review?`
  );
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  // Query db for list of all stores
  const stores = await Store.find();
  res.render("stores", { title: "Stores", stores });
};

exports.editStore = async (req, res) => {
  // Find store based off id
  const store = await Store.findOne({ _id: req.params.id });
  // Confirm owner of store
  // TODO
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
