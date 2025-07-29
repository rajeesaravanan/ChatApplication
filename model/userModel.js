const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name: {
        type: String,

    },
    username: {
        type: String
    },
    password: {
        type: String
    },
    email: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true
      },
    gender: {
    type: String,
    enum: ['male', 'female'],
    default: 'male'
    },
    education: {
                type: String
            },
    image:{
        type: String,
        default: null
    },
    registrationType: {
        type: String,
        enum: ['Manual', 'Google'],
        default: 'Manual',
      },
      logInStatus: {
        type: [Number],
        default: []
    },
    logOutStatus: {
        type: [Number],
        default: []
    },
    lastSeen: {
  type: Date,
  default: null
},
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false }


    
    
    
})


module.exports = mongoose.model('User', userSchema)