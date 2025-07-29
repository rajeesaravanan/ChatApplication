const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../model/userModel');
const SECRET_KEY = process.env.SECRET_KEY;

// // TOKEN-based logout (works with Postman)
// router.post('/api/logout', async (req, res) => {
//   try {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];
//     if (!token) return res.status(401).json({ msg: 'No token provided' });

//     const decoded = jwt.verify(token, SECRET_KEY);
//     const username = decoded.username;
//     const user = await User.findOne({ username });
//     if (!user) return res.status(404).json({ msg: 'User not found' });

//     user.logOutStatus.push(0); //  append 0
//     await user.save();

//     res.json({ msg: 'Logout successful (token-based)' });
//   } catch (err) {
//     console.error(err);
//     res.status(403).json({ msg: 'Logout failed', error: err.message });
//   }
// });





// SESSION-based logout (for browser)
router.get('/logout', async (req, res) => {
  try {
    let username = null;

    if (req.user?.username) {
      username = req.user.username;
    } else if (req.session?.passport?.user) {
      const userObj = await User.findById(req.session.passport.user);
      username = userObj?.username;
    }

    if (username) {
      const user = await User.findOne({ username });
      if (user) {
        user.logOutStatus.push(0);
          user.lastSeen= new Date()

        await user.save();
      }
    }

    req.logout(function (err) {
      if (err) {
        return res.status(500).json({ msg: "Logout error" });
      }

      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.send(`
          <script>
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login.html';
          </script>
        `);
      });
    });
  } catch (err) {
    console.error("Logout tracking error:", err);
    res.status(500).json({ msg: "Server error during logout" });
  }
});

module.exports = router;
