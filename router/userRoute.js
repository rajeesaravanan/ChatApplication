require('dotenv').config()
const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcrypt')
const User = require('../model/userModel')
const verifyToken = require('../authMiddleware'); 
const Message = require('../model/message');
const ChatRequest = require('../model/chatRequest');

require('dotenv').config();
const jwt = require('jsonwebtoken'); 

router.post('/register', async(req, res)=> { 
  

   try{
    const existingUser = await User.findOne({username: req.body.username})
    if(existingUser){
        return res.status(400).json({msg: 'User already exists' || 'Username is already taken'})
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const newUsers = await User.create({
        name: req.body.name,
        username: req.body.username,
        password: hashedPassword,
        email: req.body.email,
        gender: req.body.gender,
        education: req.body.education,
        registrationType: 'Manual'
        
    })
    res.status(200).json(newUsers)
   }catch(err){
    console.error(err)
    res.status(500).json({msg: 'Server error', err})
   }
})

router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}); 
        res.status(200).json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});



const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
        cb(null, `${Date.now()}-${safeName}`);
    }
});

const allowedTypes = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain"
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image, PDF, DOCX, PPT, XLS, and TXT files are allowed"), false);
  }
};


const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 } 
});


router.get('/profile', verifyToken, async (req, res) => {
  const user = await User.findOne({ username: req.user.username });
  res.status(200).json(user);
});

router.post('/edit-profile', verifyToken, (req, res, next) => {
    upload.single('image')(req, res, function (err) {

        if(err){
            console.error("Multer error:", err)
            return res.status(400).json({msg: err.message})
        }
      next();
    });
  }, async (req, res) => {
    try {
      console.log(" Incoming profile update");
      console.log("Request body:", req.body);
      console.log("Uploaded file:", req.file);
  
      const { username, name, education, currentPassword, newPassword, gender, email } = req.body;
  
      if (!username) {
        return res.status(400).json({ msg: 'Username is required' });
      }
  
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
   
   if (currentPassword && newPassword && currentPassword.trim() !== "" && newPassword.trim() !== "") {
  
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          console.log("Incorrect password detected!");
          return res.status(400).json({ msg: 'Incorrect password!' });
        }
  
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedNewPassword;
      }
  
      user.name = name;
      user.education = education;
      user.gender = gender;
      user.email = email
  
      if (req.file) {
        user.image = req.file.filename;
      }
  
      await user.save();
  
      return res.status(200).json({
        updatedUser: {
          name: user.name,
          education: user.education,
          image: user.image || null,
          gender: user.gender,
          email: user.email
        }
      });
  
    } catch (err) {
      console.error("Server error:", err);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  });
  
router.get('/messages/:user1/:user2', verifyToken, async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { from: user1, to: user2 },
        { from: user2, to: user1 }
      ]
    }).sort('timestamp');
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching messages', error: err.message });
  }
});

router.post('/messages/seen', verifyToken, async (req, res) => {
  const { from, to } = req.body;
  try {
    await Message.updateMany({ from, to, seen: false }, { $set: { seen: true } });
    res.status(200).json({ msg: 'Marked as seen' });
  } catch (err) {
    res.status(500).json({ msg: 'Error updating seen status', error: err.message });
  }
});

router.get("/unread-summary/:username", async (req, res) => {
  const to = req.params.username;

  const counts = await Message.aggregate([
    { $match: { to, seen: false } },
    { $group: { _id: "$from", count: { $sum: 1 } } }
  ]);

  const result = {};
  counts.forEach(entry => {
    result[entry._id] = entry.count;
  });

  res.json(result);
});

router.get('/chat-users/:username', verifyToken, async (req, res) => {
  const { username } = req.params;

  try {
    const messages = await Message.find({
      $or: [{ from: username }, { to: username }]
    });

    const usersSet = new Set();
    messages.forEach(msg => {
      if (msg.from !== username) usersSet.add(msg.from);
      if (msg.to !== username) usersSet.add(msg.to);
    });

    res.status(200).json(Array.from(usersSet));
  } catch (err) {
    console.error("Error fetching chat users:", err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});


// Send image message
router.post('/send-image', verifyToken, upload.single('image'), async (req, res) => {
  const { from, to } = req.body;
  const io = req.app.get('io'); 

  if (!req.file) return res.status(400).json({ msg: 'No image uploaded' });

  try {
    const message = await Message.create({
      from,
      to,
      image: req.file.filename,
      timestamp: new Date(),
    });

    // Emit the image message via socket to the receiver
    const receiverSocketId = global.activeUsers?.[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("private-message", {
        from,
        image: message.image,
        timestamp: message.timestamp,
      });
    }

    res.status(200).json(message);
  } catch (err) {
    console.error("Image send error:", err);
    res.status(500).json({ msg: "Error saving image message" });
  }
})


router.post('/send-file', verifyToken, upload.single('file'), async (req, res) => {
  const { from, to } = req.body;
  const io = req.app.get('io');

  if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

  try {
    const fileType = req.file.mimetype;
    const filename = req.file.filename;
    const isImage = fileType.startsWith("image/");

    // ✅ Save file in proper field
    const message = await Message.create({
      from,
      to,
      timestamp: new Date(),
      ...(isImage ? { image: filename } : { file: filename }),
      fileType,
    });

    // ✅ Emit correct field
    const receiverSocketId = global.activeUsers?.[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("private-message", {
        from,
        timestamp: message.timestamp,
        fileType,
        ...(isImage ? { image: filename } : { file: filename }),
      });
    }

    // ✅ Return correct JSON to frontend
    res.status(200).json({ file: filename, fileType });

  } catch (err) {
    console.error("File send error:", err);
    res.status(500).json({ msg: "Error saving file message" });
  }
});


// Search users by partial username (requires token)
router.get('/search', verifyToken, async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim() === "") {
    return res.status(400).json({ msg: "Missing search query" });
  }

  try {
    const users = await User.find({
      username: { $regex: new RegExp(query, "i") },  
    }, 'username name image gender'); 

    res.status(200).json(users); 
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ msg: "Search failed", error: err.message });
  }
});


// request accept/decline

router.get('/chat-request/status/:from/:to', verifyToken, async (req, res) => {
  const { from, to } = req.params;

  const request = await ChatRequest.findOne({
    $or: [
      { requester: from, receiver: to, status: 'accepted' },
      { requester: to, receiver: from, status: 'accepted' }
    ]
  });

  res.json({ allowed: !!request });
});




router.get("/pending-requests/:username", async (req, res) => {
  const { username } = req.params;
  const pending = await ChatRequest.find({ to: username, status: "pending" }).select("from -_id");
  const senders = pending.map(req => req.from);
  res.json(senders);
});




router.get('/last-seen/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ lastSeen: user.lastSeen || null });
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching last seen', error: err.message });
  }
});



router.post('/edit-message', verifyToken, async (req, res) => {
  const { messageId, newContent } = req.body;
  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    // Allow only sender to edit
    if (message.from !== req.user.username) {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    message.message = newContent;
    message.edited = true;
    await message.save();

    res.json({ msg: 'Message updated' });
  } catch (err) {
    res.status(500).json({ msg: 'Error updating message', error: err.message });
  }
});


router.post('/delete-message', verifyToken, async (req, res) => {
  const { messageId } = req.body;
  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    if (message.from !== req.user.username) {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    message.message = '';  
    message.image = null;
    message.file = null;
    message.fileType = null;
    message.deleted = true;
    await message.save();

    const io = req.app.get('io');
const receiverSocketId = global.activeUsers?.[message.to];

const payload = {
  from: message.from,
  message: '',            
  timestamp: message.timestamp,
  file: null,
  fileType: null,
  _id: message._id,
  edited: false,
  deleted: true
};

if (receiverSocketId) {
  io.to(receiverSocketId).emit("private-message", payload);
}

res.json({ msg: 'Message deleted', deletedMessage: payload });

  } catch (err) {
    res.status(500).json({ msg: 'Error deleting message', error: err.message });
  }
});



module.exports = router
