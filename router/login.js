require('dotenv').config()
const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken'); 


const User = require('../model/userModel')

const SECRET_KEY = process.env.SECRET_KEY; 


router.post('/login', async (req, res) => {
    try{
        const {username, password}=req.body

        const user = await User.findOne({username})
        

        if(!user){
            return res.status(401).json ({msg: 'Invalid username '})
        }

        // to check status

        if(user.status === 'in-review'){
            return res.status(403).json ({msg: 'Your account is in waiting list'})
        }
        if(user.status === 'inactive'){
            return res.status(403).json({msg: 'Your account is inactive'})
        }
        if(user.status === 'deleted'){
            return res.status(403).json({msg: 'Your account is deleted'})
        }


        const isMatch = await bcrypt.compare(password, user.password)
        if(!isMatch){
            return res.status(400).json({msg: 'Incorrect Password'})
        }

        /** @type {string} */
       // Generate token
       const token = jwt.sign(
        { username: user.username },
        SECRET_KEY,
        { expiresIn: '7d' }
    );
    console.log("Generated token:", token);


// login status
        user.logInStatus.push(1)
        await user.save()

        res.status(200).json({
            token,
            name: user.name,
            username: user.username,
            education: user.education,
            image: user.image || null,
            gender: user.gender,
            email: user.email, 
            registrationType: user.registrationType
        })

    }catch(err){
        console.error(err)
        res.status(500).json({msg: 'Server error', err})
    }

})

module.exports = router