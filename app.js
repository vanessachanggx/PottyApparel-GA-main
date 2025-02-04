const express = require('express');
const multer = require('multer');
const session = require('express-session');
const flash = require('connect-flash');
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Middleware Setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(flash());

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

// Make session available in templates
app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.user = req.session.user || null;
    next();
});

// Import Controllers
const controllers = {
    product: require('./controller/productController'),
    user: require('./controller/userController'),
    category: require('./controller/categoryController'),
    cart: require('./controller/cartController'),
    order: require('./controller/orderController'),
    review: require('./controller/reviewController'),
    paypal: require('./controller/paypalController')
};

// Import Middleware
const { checkAuthenticated, checkAdmin, checkUser } = require('./middleware/auth');
const { validateRegistration, validateLogin } = require('./middleware/validation');

// User Routes
app.get('/pottyApparels', controllers.user.GetpottyApparels);
app.get('/register', controllers.user.renderRegister);
app.post('/register', upload.single('Image'), validateRegistration, controllers.user.register);
app.get('/login',controllers.user.renderLogin)
app.post('/login', validateLogin, controllers.user.login);
app.get('/logout', checkAuthenticated, controllers.user.logout);
app.get('/account', checkAuthenticated, controllers.user.renderAccount);
app.get('/editAccount', checkAuthenticated, controllers.user.renderEditAccount);
app.post('/account', checkAuthenticated, upload.single('Image'), controllers.user.editAccount);
app.get('/users', checkAdmin, controllers.user.getUsers);
app.get('/user/:id', checkAdmin,controllers.user.getUser);
app.get('/editUser/:id', checkAdmin, controllers.user.editUserForm);
app.post('/editUser/:id', checkAdmin, upload.single('Image'), controllers.user.editUser);
app.get('/deleteUser/:id', checkAdmin, controllers.user.deleteUser);
app.get('/addUser', checkAdmin, controllers.user.addUserForm);
app.post('/addUser', checkAdmin, upload.single('Image'), controllers.user.addUser);


// Product Routes
app.get('/', checkAuthenticated,controllers.product.getproducts);
app.get('/product/:id',checkAuthenticated, controllers.product.getproduct);
app.get('/adminpage', checkAdmin, controllers.product.getAdminPage);
app.get('/productForm', checkAdmin, controllers.product.addProductForm);
app.post('/adminpage', checkAdmin, upload.array('images', 4), controllers.product.addProduct);
app.get('/editProduct/:id', checkAdmin, controllers.product.editProductForm);
app.post('/editProduct/:id', checkAdmin, upload.array('images', 4), controllers.product.editProduct);
app.get('/deleteProduct/:id', checkAdmin, controllers.product.deleteProduct);

// Category Routes
app.get('/categories',checkAuthenticated, controllers.category.getCategories);
app.get('/category/:id', checkAuthenticated,controllers.category.getCategory);
app.get('/admin/categories', checkAdmin, controllers.category.getAdminCategories);
app.get('/admin/category/:id', checkAdmin, controllers.category.getAdminCategory);
app.get('/addCategoryForm', checkAdmin, controllers.category.addCategoryForm);
app.post('/admin/categories', checkAdmin, upload.single('Image'), controllers.category.addCategory);
app.get('/editCategory/:id', checkAdmin, controllers.category.editCategoryForm);
app.post('/editCategory/:id', checkAdmin, upload.single('Image'), controllers.category.editCategory);
app.get('/deleteCategory/:id', checkAdmin, controllers.category.deleteCategory);

// Cart Routes
app.get('/cart', [checkAuthenticated, checkUser], controllers.cart.getCart);
app.post('/cart', [checkAuthenticated, checkUser], upload.single('Image'), controllers.cart.addToCartForm);
app.get('/removeFromCart/:id', [checkAuthenticated, checkUser], controllers.cart.removeFromCart);
app.post('/updateCartProduct/:id', [checkAuthenticated, checkUser], controllers.cart.updateCartProduct);
app.get('/checkout', [checkAuthenticated, checkUser], controllers.cart.checkout);

// Order Routes
app.get('/invoice', checkAuthenticated, controllers.order.generateInvoice);
app.get('/orders', checkAdmin, controllers.order.getOrders);
app.get('/invoice/:orderId', checkAuthenticated, controllers.order.generateInvoice);
app.get('/invoice2/:orderId', [checkAuthenticated,checkAdmin ], controllers.order.generateInvoice2);
app.get('/viewOrders', checkAdmin, controllers.order.getOrders);


// PayPal Routes
app.post('/api/orders', [checkAuthenticated, checkUser], controllers.paypal.createOrderHandler);
app.post('/api/orders/:orderID/capture', [checkAuthenticated, checkUser], controllers.paypal.captureOrderHandler);
app.get('/checkout/:paymentMethod/:orderId/:transactionId', [checkAuthenticated, checkUser], controllers.cart.processPayment);

// Reviews Routes
app.get('/product/:id', checkAuthenticated, controllers.review.getProductReviews);
app.post('/product/:id', checkAuthenticated, upload.single('reviewImage'), controllers.review.addReview);
app.get('/review/edit/:id', checkAuthenticated, controllers.review.editReviewForm);
app.post('/review/edit/:id', checkAuthenticated, upload.single('reviewImage'), controllers.review.editReview);
app.get('/review/delete/:id', checkAuthenticated, controllers.review.deleteReview);

//errors
app.get('/401', (req, res) => {
    res.render('401', { errors: req.flash('error') });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
