require('express');
const product = require('../models/product');
const categoryModel = require('../models/category');
const brandModel = require('../models/brand')
const upload = require('../helpers/multer')
const mongoose = require('mongoose');

//product detail showing page
const productDetails = async( req,res)=>{
    try {      
        if(req.session.isUser){
            const productId = req.params.productId;
            if (!mongoose.isValidObjectId(productId)) {
                console.log('Invalid product ID');
                return res.status(400).json({ error: 'Invalid product ID' });
            }

            const product_details = await product.findById(productId);
            const category = await categoryModel.find();
            const brand = await brandModel.find();

            if(!product_details){
                console.log('product details not found')
                return res.status(404).json({ error: 'Product not found' });             
            }else{
                res.render('user/productDetails',{products:product_details,category,brand})
            }   
        }
    } catch (error) {
        console.log("product adding error:",error.message)
    }   
}

module.exports ={
    productDetails
}