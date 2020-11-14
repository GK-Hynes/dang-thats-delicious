const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const slug = require("slugs");

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: "Please enter a store name"
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: "Point"
    },
    coordinates: [
      {
        type: Number,
        require: "You must supply coordinates!"
      }
    ],
    address: {
      type: String,
      required: "You must supply an address!"
    }
  },
  photo: String
});

// Create slug from store name
storeSchema.pre("save", function (next) {
  if (!this.isModified("name")) {
    next(); // skip
    return; // stop the function
  }
  this.slug = slug(this.name);
  next();
  // TODO make sure slugs are unique
});

module.exports = mongoose.model("Store", storeSchema);
