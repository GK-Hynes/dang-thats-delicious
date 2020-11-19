const passport = require("passport");
const crypto = require("crypto");
const mongoose = require("mongoose");
const promisify = require("es6-promisify");
const User = mongoose.model("User");
const mail = require("../handlers/mail");

exports.login = passport.authenticate("local", {
  failureRedirect: "/login",
  failureFlash: "Failed Login!",
  successRedirect: "/",
  successFlash: "You are now logged in"
});

exports.logout = (req, res) => {
  req.logout();
  req.flash("success", "You are now logged out 👋");
  res.redirect("/");
};

exports.isLoggedIn = (req, res, next) => {
  // check if user is authenticated
  if (req.isAuthenticated()) {
    next(); // carry on, they're logged in
    return;
  }
  req.flash("error", "Oops! You must be logged in");
  res.redirect("/login");
};

exports.forgot = async (req, res) => {
  // See if user with that email exists
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash("error", "No account with that email exists");
    return res.redirect("/login");
  }
  // Set reset tokens and expiry on account
  user.resetPasswordToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
  await user.save();
  // Send email with token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user,
    subject: "Password Reset",
    resetURL,
    filename: "password-reset"
  });
  req.flash("success", `You have been emailed a password reset link.`);
  // redirect to login page
  res.redirect("/login");
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    // Check if the token has yet to expire
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired");
    return res.redirect("/login");
  }
  // If there is a user show them the reset password form
  res.render("reset", { title: "Reset Your Password" });
};

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body["password-confirm"]) {
    next(); // keep it going
    return;
  }
  req.flash("error", "Passwords do not match!");
  res.redirect("back");
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    // Check if the token has yet to expire
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired");
    return res.redirect("/login");
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  // Remove token-related fields
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash(
    "flash",
    "💃 Nice! Your password has been reset! You are now logged in!"
  );
  res.redirect("/");
};
