const mongoose = require("mongoose");

const chatRequestSchema = new mongoose.Schema({
  requester: { type: String, required: true },  // user sending request
  receiver: { type: String, required: true },   // user receiving request
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ChatRequest", chatRequestSchema);
