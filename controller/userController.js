require('express');
const userModel = require('../models/userModel');
const product = require('../models/product');
const categoryModel = require('../models/category');
const brandModel = require('../models/brand');
const Otp = require('../models/otp');
const session = require('express-session');
const bcrypt = require('bcrypt');
const passport = require('passport');
require('body-parser');
const { check, validationResult } = require('express-validator');
const mailer = require('../controller/GoogleAuthController');


//render homepage
const homePage = async(req,res)=>{
    try {
        const products = await product.find({isActive:true})
        const user = req.session.isUser;
       if(user){
        res.render('user/homePage',{No_icons:false,products:products,user:user})
       }else{
        res.render('user/homePage',{No_icons:true,products:products})
       }               
    } catch (error) {
        console.log('homePage:',error.message)
    }
}

//render login page
const login =(req,res)=>{
   try {
    if(!req.session.isUser){
    res.render('user/login',{No_icons:true})
    }else{
        res.redirect('/user/home')
    }
   } catch (error) {
    console.log(error.message)
   }
}

//render signup page
const signup = (req,res)=>{
    try {
        if(!req.session.isUser){
        res.render('user/signup',{No_icons:true})
    }else{
        res.redirect('/user/home')
    }   
    } catch (error) {
        console.log(error.message)
    }
}


//generate random otp
const randomOtp = async() => {
    return Math.floor(1000 + Math.random() *9000);
  }
  
//user signup
const signupAction = async(req,res)=>{
    try {

        //check errors in express validator
        const errors = validationResult(req);
         if (!errors.isEmpty()) {
         res.render('user/signup', { errors: errors.array() });
        }else{
    const {email,name,password,Password_Confirm} = req.body;
            req.session.email = email;

        //checking if user is already exist or not
       const userExist = await userModel.findOne({email:email})
       if(userExist){
        res.render('user/signup',{message:"user already exist"})  
       }else{ 
        if(password !== Password_Confirm){
            res.render('user/signup',{message:"Password is not matching."})
        }else{
            const hashedPassword = await bcrypt.hash(password,10)
            req.body.password = hashedPassword

        // Storing the details in session
        req.session.userDetails = {
        email: req.body.email,
        name: req.body.name,
        password: req.body.password,
         };

           const existingOtp = await Otp.findOneAndDelete({ email: email });
           //otp generate 
           const g_otp = (await randomOtp()).toString();
            const hashedOtp = await bcrypt.hash(g_otp, 10)
            const msg = '<p> Hi <b>'+name +'</b>, </br> <h4>'+g_otp +'</h4> </p>'
              
            //save otp in model
              const otpData  =new Otp({
                email:email,
                otp: hashedOtp, 
                Date:new Date()
              })
             const userOtp =await otpData.save();

              //send otp to user
            mailer.sendMail(email, 'Otp Verification',msg);
            res.render('user/otpPage',{show:"otp send successfully.please check your email.",isError:false}) 
          
             // deleting the doc after 2 min
            setTimeout(async () => {   
                try {
                await Otp.findOneAndDelete({ otp: userOtp.otp });
                res.render('user/otpPage',{show:"Otp time out, resend otp.",isError:true}) 

                } catch (error) {
                  console.log('2 minutes error:', error.message);
                } 
             }, 120000);             
              console.log('otp send successfully')
    }}}
    }
     catch (error) {
      console.log('singup error:' ,error.message)
    }
}


//verify otp and enter into homepage
const verifyOtp = async(req,res)=>{
    try {     
            const otpDigits =[
                req.body.otpDigit1,
                req.body.otpDigit2,
                req.body.otpDigit3,
                req.body.otpDigit4
            ]

            // Check if any OTP digit is missing or not a number
            const missingOrInvalidDigit = otpDigits.some(digit => !digit || isNaN(digit));
            if (missingOrInvalidDigit) {
                console.log("Invalid OTP digits:", otpDigits);
                res.render('user/otpPage',{show:"Invalid otp.",isError:true}) 
                return;
            }
            const enteredOtp = otpDigits.join('');
            const email = req.session.email;
           
            //retrieve otp data from database
            const userValue = await Otp.findOne({email})

            //if retrieve data from data base check otp and enter to home page
            if(userValue){
                if(userValue.email === email){
                    const otpMatch = await bcrypt.compare(enteredOtp,userValue.otp);
                    console.log(otpMatch)
                    if(otpMatch){
                        console.log("otp is matching");
                        await Otp.findOneAndDelete({ otp: userValue.otp });

                        //retrieve data from session
                        const userDetailsData = req.session.userDetails;
                        console.log("userdetails data in session:",userDetailsData.name)
                        const userDetails = new userModel(userDetailsData);
                        userDetails.save()
                        .then(savedUser =>{
                            console.log('user saved successfully:',savedUser)
                        })
                        .catch(error =>{
                            console.log("error in saving data",error)
                        })
                        req.session.isUser =userDetailsData.name;
                        res.redirect('/user/home')
                    }else{
                        console.log("otp not match");
                        res.render('user/otpPage',{show:"otp is not matching, please enter the correct otp.",isError:true}) 
                    }
                }else{
                    res.render('user/otpPage',{show:"Invalid otp.",isError:true}) 
                }
            }else{
                res.render('user/otpPage',{show:"Invalid otp.",isError:true}) 
            }
    } catch (error) {
        console.log("verify otp:",error.message)
    }
}

//resend otp 
const resendOtp = async(req,res)=>{
    try {
        //retrieve data from session
        if(req.session.userDetails){
        const {email, name}= req.session.userDetails;

         //find and delete old otp data
         const existingOtp = await Otp.findOneAndDelete({ email: email });
 
         //generate otp
         const g_otp = (await randomOtp()).toString();
         const hashedOtp = await  bcrypt.hash(g_otp,10);
         const message = '<p> Hi <b>'+name +'</b>, </br> <h4>'+g_otp +'</h4> </p>'   
 
          //save otp in model
         const otpData  =new Otp({
             email:email,
             otp: hashedOtp, 
             Date:new Date()
          })
          const userOtp =await otpData.save();  
          //send email containing otp
         mailer.sendMail(email, 'Otp Verification',message);
            res.render('user/otpPage',{show:"otp resend successfully.please check your email.",isError:false}) 
         
           // deleting the doc after 2 min
            setTimeout(async () => {   
                 try {
                 await Otp.findOneAndDelete({ otp: userOtp.otp });
                //  res.render('user/otpPage',{show:"otp verifying timeout. resend otp.",isError:true}) 
                 console.log('otp deleted after 2 minutes');
                 } catch (error) {
                   console.log('2 minutes error:', error.message);
                 } 
              }, 120000);           
        } else{
            res.render('user/otpPage',{show:"invalid otp.",isError:true}) 
        }           
    } catch (error) {
        console.log("resend error: ",error.message)
    } 
}

//login user
const loginAction = async(req,res)=>{
    try {
        
        const email =req.body.email;
        const password = req.body.password;
        const check = await userModel.findOne({email:email})
        if(check){
            if(check.isActive === true){
                const passwordMatch = await bcrypt.compare(password,check.password);
            if(passwordMatch){

                req.session.isUser = check.name;
                res.redirect('/user/home')
            }else{
                res.render('user/login',{message:"password not matching.",No_icons:true}) 
            }
            
            }else{
                res.render('user/login',{message:"user is blocked by the admin for malpractice.",No_icons:true}) 
            }
        }else{
            res.render('user/login',{message:"User not exist. Please signup",No_icons:true})
        }

        } catch (error) {
        return res.status(400).json({
            success: false,
            loginMessage: error.message
        })
     
    }
}


//user logout action
const logout =(req,res)=>{
        req.session.destroy();
        res.clearCookie('connect.sid')
        res.redirect('/user/home')
}

// render the page containing all the products 
const categoryPage =  async(req, res) => {    
    try {     
        const category = await categoryModel.find();
        const brands = await brandModel.find();
        const products = await product.find();
        res.render('user/categoryPage',{category,brands,products});
        
    } catch (error) {
        console.log('loading category page by user:',error.message);
    }  
}

// api for filter by brands
const brandFilter = async (req, res) => {
    try {
        const brandId = req.query.brand;
        console.log(brandId)
        const products = await product.find({ brand: brandId }).populate('brand').exec();
        console.log("products are for brand fetching:",products);
        // res.render('user/categoryPage',{products} );
        res.json({ products });
    } catch (error) {
        console.log('brandfilter error:',error.message)
    }
};


//to render user profile
const profilePage = async(req, res) => {
    try {
        if(req.session.isUser){    
            const user = req.session.isUser
            const userData = await userModel.findOne({name:user});
            const userId =  userData._id.toString();
            res.render('user/userProfile',{ userData:userData, userId})
        }else{
            res.render('404error')
        }
    } catch (error) {
        console.log('profile :',error.message);
        // res.status(500).render('404error', { status: 500, message: 'Internal Server Error' });
    }
}


//updating the user profile
// const profileUpdate = async(req, res) => {
//     try {

//         const user = req.session.isUser
//         const userData = await userModel.findOne({name:user});
//         if(!userData){     
//             return res.render('user/userProfile');
//         }
//         if (req.file) {
//             if (userData.profileImage) {
//                 const imagePath = path.join(__dirname, '../public/images/userProfile', userData.profileImage);
//                 fs.unlinkSync(imagePath);
//             }

//             // Update the profile image in the user document
//             userData.profileImage = req.file.filename;
//         }
//         await userData.save()
//         const userId = userData._id.toString();
//         const updateProfile = await userModel.findByIdAndUpdate(userId, {
//             name: req.body.name,
//             email: req.body.email,
//             mobileNumber: req.body.mobileNumber,
//             gender: req.body.gender,
//             // profileImage: req.file.filename 
//         }, { new: true });
//         req.flash('success','user profile edited successfully.')
//         res.redirect('/user/profile')
//     } catch (error) {
//         console.log('profile update:',error.message);
//         res.status(500).render('404error', { status: 500, message: 'Internal Server Error' });
//     }
// }

const fs = require('fs');
const path = require('path');

// updating the user profile
const profileUpdate = async (req, res) => {
    try {
        const user = req.session.isUser;
        const userData = await userModel.findOne({ name: user });
        if (!userData) {
            return res.render('user/userProfile');
        }

        if (req.file) {
            if (userData.profileImage) {
                const imagePath = path.join(__dirname, '../public/images/userProfile', userData.profileImage);
                fs.unlinkSync(imagePath);
            }

            userData.profileImage = req.file.filename;
        }

        // Update other user profile fields
        userData.name = req.body.name;
        userData.email = req.body.email;
        userData.mobileNumber = req.body.mobileNumber;
        userData.gender = req.body.gender;
        await userData.save();

        req.flash('success', 'user profile edited successfully.');
        res.redirect('/user/profile');
    } catch (error) {
        console.log('profile update:', error.message);
        res.status(500).render('404error', { status: 500, message: 'Internal Server Error' });
    }
}


//user address page
const addressManage = async(req, res) => {
    try {
        if(req.session.isUser){
        const addressId = req.params.id;
        if(addressId){
           console.log('error');
        }else{      
            const userName = req.session.isUser;
            const userData = await userModel.findOne({name:userName});
            const userAddress = userData.address;
            res.render('user/userAddress',{users:userAddress,editMode:false});              
        }  
        }
    } catch (error) {
        console.log('address page render:',error.message);
        res.status(404).render('404error', { status: 404, message: error.message });
    }
    
}


//adding user address
const addAddress = async(req, res) => {
    try {
            const user = req.session.isUser;
            const userData = await userModel.findOne({name:user});
            if(userData){
                const newAddress = {
                    street : req.body.street,
                    city : req.body.city,
                    state: req.body.state,
                    pinCode : req.body.pinCode,
                    country : req.body.country
                };
                await userModel.findByIdAndUpdate(
                    userData._id,
                    {$push : { address : newAddress }},
                    { new : true, userFindAndModify :false}
                );
                req.flash('success', 'New address added successfully.')
                res.redirect('/user/address')
            }else{
                console.log('user is not found');
            }    
    } catch (error) {
        console.log('address update error:',error.message);
        res.status(500).render('404error', { status: 500, message: error.message });
    }
}


//render address editing page
const addressEditpage = async(req, res) => {
    try {
        
        if(req.session.isUser){
            const addressId = req.params.id;
            const userName = req.session.isUser;
            const userData = await userModel.findOne({name:userName});
            const userAddress = userData.address;
            const addressToEdit = userAddress.find(address => address._id.toString() === addressId);
            console.log(addressId)
            res.render('user/userAddress',{users:userAddress,editMode:true,addressToEdit}); 
        }
    } catch (error) {
        console.log('render edit page:',error.message);
        res.status(500).render('404error', { message: error.message });
    }   
}


//user editing address
const updateAddress = async(req, res) => {
    try {
        
        const addressId = req.params.id;
        const userName = req.session.isUser;
        await userModel.updateOne(
            {name:userName, 'address._id': addressId},
            {$set: {
                "address.$.street" : req.body.street,
                "address.$.city": req.body.city,
                "address.$.state": req.body.state,
                "address.$.country": req.body.country,
                "address.$.pinCode": req.body.pinCode
            }}
        )
        req.flash('success','Your address is updated successfully.')
        res.redirect('/user/address');

    } catch (error) {
        console.log('user editing address:',error.message);
        res.status(500).render('404error', { message: error.message });
    }
}


//deleting user address
const deleteAddress = async(req, res) => {
    try {

    const addressId = req.params.id;
    const userName = req.session.isUser;
    const user = await userModel.findOneAndUpdate(
        { name : userName },
        { $pull : { address: { _id: addressId } } },
        {new : true}
    );

    if (!user) {
        req.flash('error', 'User not found or address not found');
        return res.redirect('/user/address');
      }

    req.flash('success','address deleted successfully');
    res.redirect('/user/address');
    } catch (error) {
        console.log('delete address:',error.message);
        req.flash('error','some error occured while deleting address');
        res.redirect('/user/address')
    }
}


//render changing password page
const changePasswordPage = async(req, res) => {
    try {

        if(req.session.isUser){
            const userName = req.session.isUser;
            const user = await userModel.findOne({name : userName});
            const userId = user._id.toString();
            res.render('user/changepass',{userId});
        }
    } catch (error) {
        console.log('password Page:',error.message);
        res.status(500).render('404error', { message: error.message });
    }
   
}

//changing user password
const changePass = async(req, res) => {
    try {
        const userId = req.params.id;
        const userData = await userModel.findById(userId);

        if(!userData){
            req.flash('error','user not found.');
            return res.redirect('/user/password');
        }

            const oldePassword = userData.password;
            const isPasswordMatch = await bcrypt.compare(req.body.password, oldePassword)
            
            if(!isPasswordMatch){
                req.flash('error','Current password is incorrect.');
                return res.redirect('/user/password');
            }

                const{ newpassword, confirmPassword } = req.body;

                if(newpassword !==  confirmPassword){
                    req.flash('error','New password and confirm password should be the same.');
                    return res.redirect('/user/password')
                }

                    const hashPassword = await bcrypt.hash(newpassword, 10);
                    await userModel.findByIdAndUpdate(userId,{
                        password : hashPassword,     
                    },{ new: true });
              
          req.flash('success','Password changed successfully.');
          res.redirect('/user/password');        

    } catch (error) {

        console.log('password change error:',error.message);
        req.flash('error','An error occurred while changing the password. Please try again.');
        res.redirect('/user/password');
    }
}


//adding products to the cart list
const addToCart = async(req, res) => {
    const { productId } = req.body;
    try {
        const products = await product.findById(productId);
        if(!products){
            throw new Error('product not found');
        }

         // Add product ID to cart in session
         req.session.cart = req.session.cart || [];
         req.session.cart.push(productId);
         res.redirect('/user/cart'); 

    } catch (error) {
        console.log('addtocart error:',error.message);

    } 
}

//showing cart page
const cartPage = async(req, res) => {
    try {
        if(req.session.isUser){
        const cartItemIds = req.session.cart || [];
        const cartItems = await product.find({ _id: { $in: cartItemIds } });
        res.render('user/cartPage', { cartItems });
        }else{
            res.redirect('/user/login');
        }
    } catch (error) {
        console.log('Cart Page error:',error.message);
        res.redirect('back');
    }  
}


//deleting products from cart lists
const deleteCart = async(req, res) => {
    try {
        const cart = req.session.cart || [];
        const productIndex = cart.findIndex(item => item === req.params.id);

        if (productIndex !== -1) {
            cart.splice(productIndex, 1);
            req.session.cart = cart;
            req.flash('success','The cart product is deleted successfully.');

        }else{

            req.flash('error','product not found in the cart.');

        }
        res.redirect('/user/cart');

    } catch (error) {
        console.log('delete cart:',error.message);
        req.flash('error','Error in deleting the cart.');
        res.redirect('/user/cart');
    }
}



const orderList = async(req, res) => {
    res.render('user/orderList')
}

module.exports ={
    login,
    signupAction,
    loginAction,
    homePage,
    signup,
    resendOtp,
    verifyOtp,
    logout,
    categoryPage,
    brandFilter,
    profilePage,
    addressManage,
    orderList,
    profileUpdate,
    addAddress,
    addressEditpage,
    updateAddress,
    deleteAddress,
    changePasswordPage,
    changePass,
    cartPage,
    addToCart,
    deleteCart
}