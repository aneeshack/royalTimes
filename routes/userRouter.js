const express = require('express');
const userRouter = express.Router();
const userController = require('../controller/userController');
const googleAuth = require('../controller/GoogleAuthController');
const valid = require('../middleware/userValidation');
const passport = require('passport')
const upload = require('../helpers/userMulter')
const {signupValidator, otpMailValidator}= require('../helpers/userValidate')
require('../config/passport')

//google signup
userRouter.get('/auth/google',passport.authenticate('google',{
    scope: ['email','profile'],
    prompt: 'select_account'
}));    
userRouter.get('/auth/google/callback', passport.authenticate('google', {
    scope:['profile','email'],
    failureRedirect: '/user/failure'
}), googleAuth.successGoogleLogin);
userRouter.get('/failure',googleAuth.failureGoogleLogin)


//user validation routes
userRouter.get('/home',userController.homePage);
userRouter.get('/logout',valid.isLogout,userController.logout)
userRouter.get('/login',userController.login);
userRouter.post('/login',userController.loginAction);
userRouter.get('/signup',userController.signup);
userRouter.post('/signup',signupValidator,otpMailValidator,userController.signupAction);//signup and otp send
userRouter.get('/resendOtp',userController.resendOtp); 
userRouter.post('/verifyOtp',userController.verifyOtp)

//user activity routes
userRouter.get('/category',userController.categoryPage);
userRouter.get('/api/products',userController.brandFilter);

//user profile details
userRouter.get('/profile',userController.profilePage);
userRouter.post('/profile/:id',upload.single('profileImage'),userController.profileUpdate);

userRouter.get('/address',userController.addressManage);
userRouter.post('/address/:id',userController.addAddress);
userRouter.get('/address/edit/:id',userController.addressEditpage);
userRouter.post('/address/edit/:id',userController.updateAddress);
userRouter.get('/address/delete/:id',userController.deleteAddress);
userRouter.get('/password',userController.changePasswordPage);
userRouter.post('/password/:id',userController.changePass);


userRouter.get('/orders',userController.orderList);
userRouter.get('/cart',userController.cartPage);

module.exports =userRouter
    