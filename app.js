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
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage }); // Use the storage configuration

// Set up view engine
app.set('view engine', 'ejs');

// Enable static files
app.use(express.static('public'));

// Enable form processing
app.use(express.urlencoded({
    extended: false
}));

app.use(flash());

app.use(session({
    secret: 'secret',  // Change this to a secret string for better security
    resave: false,              // Don't save session if unmodified
    saveUninitialized: true,    // Save sessions that are new but haven't been modified
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }  // If using https, set `secure: true`
}));

app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// Controllers
const productController = require('./controller/productController');
const userController = require('./controller/userController');
const categoryController = require('./controller/categoryController');
const cartController = require('./controller/cartController');
const orderController = require('./controller/orderController');
const paypalController = require('./controller/paypalController.js');


// Import middleware
const { checkAuthenticated, checkAdmin, checkUser } = require('./middleware/auth');
const { validateRegistration, validateLogin } = require('./middleware/validation');

//Route

//user
app.get('/pottyApparels', userController.GetpottyApparels);
app.get('/register',userController.renderRegister)
app.post('/register', upload.single('Image'), userController.register);
app.get('/login',userController.renderLogin)
app.post('/login',userController.login)
app.get('/account', userController.renderAccount);
app.get('/editAccount', userController.renderEditAccount)
app.post('/account',upload.single('Image'),userController.editAccount);


//product
app.get('/', productController.getproducts);
//app.get('/search',productController,searchProduct);
app.get('/product/:id', productController.getproduct);
app.get('/adminpage', productController.getAdminPage);
app.get('/productForm', productController.addProductForm);
app.post('/adminpage', upload.array('images', 4), productController.addProduct);
app.get('/editProduct/:id', productController.editProductForm);
app.post('/editProduct/:id', upload.array('images', 4), productController.editProduct);
app.get('/deleteProduct/:id', productController.deleteProduct);

//Category
app.get('/categories', categoryController.getCategories);
app.get('/category/:id', categoryController.getCategory);
app.get('/admin/categories', categoryController.getAdminCategories);
app.get('/admin/category/:id', categoryController.getAdminCategory);
app.get('/addCategoryForm', categoryController.addCategoryForm);
app.post('/admin/categories', upload.single('Image'),categoryController.addCategory);
app.get('/editCategory/:id', categoryController.editCategoryForm);
app.post('/editCategory/:id', upload.single('Image'), categoryController.editCategory);
app.get('/deleteCategory/:id', categoryController.deleteCategory);

//cart
app.get('/cart', cartController.getCart);
app.post('/cart',upload.single('Image'), cartController.addToCartForm);
app.get('/removeFromCart/:id', cartController.removeFromCart);
app.post('/updateCartProduct/:id', cartController.updateCartProduct);

//Order
app.get('/checkout', orderController.getCheckOut);
app.get('/invoice/:orderId', orderController.generateInvoice);
app.get('/order-success', orderController.handleOrderSuccess);



//Paypal
app.use(express.json());

app.post("/api/orders",paypalController.createOrderHandler);
app.post("/api/orders/:orderID/capture",paypalController.captureOrderHandler);
app.get("/checkout/:paymentMethod/:orderId/:transactionId", orderController.getCheckOut)


app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
