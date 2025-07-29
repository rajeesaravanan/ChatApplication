
require('dotenv').config();

const session = require('express-session');
const passport = require('passport');
const jwt = require('jsonwebtoken'); 
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require ('path')

const Message = require('./model/message')
const ChatRequest = require('./model/chatRequest')
const User = require('./model/userModel'); 

const botRoute = require('./router/botRoute'); 


require('./authGoogle'); 
const userRoute = require('./router/userRoute')
const loginRoute = require('./router/login')
const logoutRoute = require('./router/logout')


const app = express()
const http = require('http');
const server = http.createServer(app); 
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });


const PORT = 2700

app.use(express.json())
app.use(cors())
app.use('/uploads', express.static(path.join(__dirname,'public/uploads')))
app.use("/images", express.static(path.join(__dirname, "public/images")));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use(session({
    secret: 'secret', 
    resave: false, 
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/user', userRoute, loginRoute)
app.use('/auth', logoutRoute)

app.use('/bot', botRoute);     

// google auth route
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: "select_account" }));


app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    const token = jwt.sign(
      { username: req.user.username },
      process.env.SECRET_KEY,
      { expiresIn: '7d' }
    );
    res.redirect(`/auth-success.html?token=${token}`);
    // res.redirect(`/profile.html?token=${token}`);
  }
);

// mongodb connection
mongoose.connect('mongodb://127.0.0.1:27017/TaskLoginStatus')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));


let disconnectTimers = {}; 
let activeUsers = {}; 


app.set('io', io); 
global.activeUsers = activeUsers; 

io.on('connection', (socket) => {

  socket.on('user-online', (username) => {
    if (username) {
      activeUsers[username] = socket.id;

    if (disconnectTimers[username]) {
      clearTimeout(disconnectTimers[username]);
      delete disconnectTimers[username];
    }
      const otherUsers = Object.keys(activeUsers).filter(user => user !== username);
      socket.emit('notify-existing-users', otherUsers); 
      socket.broadcast.emit('notify-user-active', username); 
    }


    // Step 1: Notify user of any pending chat requests
ChatRequest.find({ receiver: username, status: 'pending' })
  .then(pendingRequests => {
    pendingRequests.forEach(req => {
      socket.emit("receive-chat-request", { from: req.requester });
    });
  })
  .catch(err => {
    console.error("Error checking pending chat requests:", err.message);
  });

  });
  
socket.on('private-message', async ({ to, from, message, timestamp }) => {
  try {
await Message.create({ from, to, message, timestamp });
    const receiverSocketId = activeUsers[to];
        const senderSocketId = activeUsers[from];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit('private-message', {
        from,
        message,
        timestamp,
        seen: false,
      });

      const unreadCount = await Message.countDocuments({
        from,
        to,
        seen: false
      });
      io.to(receiverSocketId).emit("unread-count-update", {
        from,
        count: unreadCount
      });
      const receiverSocket = io.sockets.sockets.get(receiverSocketId);
      if (receiverSocket && receiverSocket.chattingWith === from) {
        await Message.updateMany(
          { from, to, seen: false },
          { $set: { seen: true } }
        );

        if (senderSocketId) {
          io.to(senderSocketId).emit("messages-seen", { by: to });
        }
      }
    
    }
    if (message.image) {
  io.to(receiverSocketId).emit('private-message', {
    from,
    image: message.image,
    timestamp,
    seen: false,
  });
}

  } catch (err) {
    console.error("Failed to save message:", err.message);
  }
});
socket.on("chat-opened", async ({ viewer, withUser }) => {
  try {
    // Track who the socket is chatting with
    socket.chattingWith = withUser;

    await Message.updateMany(
      { from: withUser, to: viewer, seen: false },
      { $set: { seen: true } }
    );

    const senderSocketId = activeUsers[withUser];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messages-seen", { by: viewer });
    }
  } catch (err) {
    console.error("Failed to update seen status:", err.message);
  }
});

 socket.on("typing", ({ from, to }) => {
    const receiverSocketId = activeUsers[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { from, to });
    }
  });

  //Handle chat request from User A to User B
socket.on('chat-request', async ({ from, to }) => {
  try {
    let existing = await ChatRequest.findOne({ requester: from, receiver: to });

    if (!existing) {
      existing = await ChatRequest.create({ requester: from, receiver: to });
    }

    const receiverSocketId = activeUsers[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive-chat-request", { from });
    }
  } catch (err) {
    console.error("Chat request error:", err.message);
  }
});

// Handle response from User B (accept/decline)
socket.on('chat-request-response', async ({ from, to, accepted }) => {
  try {
    const status = accepted ? 'accepted' : 'declined';
    await ChatRequest.findOneAndUpdate({ requester: from, receiver: to }, { status });

    const requesterSocketId = activeUsers[from];
    if (requesterSocketId) {
      io.to(requesterSocketId).emit("chat-request-result", { to, accepted });

      if (accepted) {
        io.to(requesterSocketId).emit("open-chat", { withUser: to });
        io.to(socket.id).emit("open-chat", { withUser: from });
      }
    }
  } catch (err) {
    console.error("Chat request response error:", err.message);
  }
});

  socket.on('disconnect', () => {
  const user = Object.keys(activeUsers).find(key => activeUsers[key] === socket.id);
  if (user) {
    disconnectTimers[user] = setTimeout(async () => {
      delete activeUsers[user];
      delete disconnectTimers[user];

      try {
        await User.updateOne(
          { username: user },
          { lastSeen: new Date() },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error updating last seen:', err);
      }

      io.emit('update-active', { username: user, status: 'offline' });
    }, 5000);
  }
});

})

server.listen(PORT, ()=>console.log(`Server is running on ${PORT}`))
