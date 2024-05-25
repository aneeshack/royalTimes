const express = require('express');
const userRouter = express.Router();
const userController = require('../controller/userController');
const googleAuth = require('../controller/GoogleAuthController');
const valid = require('../middleware/userValidation');
const passport = require('passport')
const upload = require('../helpers/multer')
const {signupValidator, otpMailValidator}= require('../helpers/userValidate')
require('../config/passport')


//google signup strategies
// userRouter.use(passport.initialize());
// userRouter.use(passport.session());
userRouter.get('/auth/google',passport.authenticate('google',{
    scope: ['email','profile'],
    prompt: 'select_account'
}));    
userRouter.get('/auth/google/callback', passport.authenticate('google', {
    scope:['profile','email'],
    failureRedirect: '/user/failure'
}), googleAuth.successGoogleLogin);
userRouter.get('/failure',googleAuth.failureGoogleLogin)



userRouter.get('/home',userController.homePage);
userRouter.get('/logout',valid.isLogout,userController.logout)
userRouter.get('/login',userController.login);
userRouter.post('/login',userController.loginAction);
userRouter.get('/signup',userController.signup);
userRouter.post('/signup',signupValidator,otpMailValidator,userController.signupAction);//signup and otp send
userRouter.get('/category',userController.categoryPage);
userRouter.get('/api/products',userController.brandFilter);

userRouter.get('/resendOtp',userController.resendOtp); 
userRouter.post('/verifyOtp',userController.verifyOtp)

module.exports =userRouter
    