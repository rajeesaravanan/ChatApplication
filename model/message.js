const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  from: String,
  to: String,
  message: String,
  image: String,   // only if it's an image
  file: String,    // for PDF, DOCX, etc.
  fileType: String,
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },

  timestamp: {
    type: Date,
    default: Date.now,
  },
  seen: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Message", messageSchema);
