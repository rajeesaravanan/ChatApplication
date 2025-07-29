require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./model/userModel');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: 'http://redirectmeto.com/http://192.168.1.128:2700/auth/google/callback'

},
async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
            // If not exist ➔ create user
            user = await User.create({
                name: profile.displayName,
                username: profile.emails[0].value.split('@')[0], 
                email: profile.emails[0].value,
                password: '', 
                gender: 'male', 
                education: '',
         
                registrationType: 'Google'
            });
        }else{
            user.logInStatus.push(1)  //login status
            await user.save()
        }
        done(null, user);

        
    } catch (err) {
        done(err, null);
    }
}));



