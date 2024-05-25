const { check } = require('express-validator');

exports.addProductValidator = [
    // check('productName', 'Product name is required').not().isEmpty(),

    check('productName', 'Product name is required').not().isEmpty().custom((value, { req }) => {
        // Check if the name contains only spaces
        if (value.trim().length === 0) {
            throw new Error('Product name is required');
        }
        return true;
    }),    check('price', 'Price must be a number').isFloat({ gt: 0 }),
    check('stock', 'Stock must be a number').isInt({ gt: -1 }),
    check('warranty', 'Warranty must be a number').optional().isInt({ gt: -1 }),
    check('rating', 'Rating must be a number between 1 and 5').optional().isFloat({ min: 1, max: 5 }),
    check('brand', 'Brand is required').not().isEmpty(),
    check('category', 'Category is required').not().isEmpty(),
    check('images').custom((value, { req }) => {
        if (!req.files || req.files.length !== 3) {
            throw new Error('Exactly three images are required');
        }
        req.files.forEach(file => {
            if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype)) {
                throw new Error('Only jpeg and png images are allowed');
            }
        });
        return true;
    })
];
