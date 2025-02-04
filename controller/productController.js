const db = require('../db'); // Ensure db.js exports the correct MySQL connection

exports.getproducts = (req, res) => { 
    const sql = 'SELECT * FROM product'; 
    db.query(sql, (error, results) => { 
        if (error) { 
            console.error('Database query error:', error.message);  
            return res.status(500).send('Error retrieving products');  
        } 

        console.log('Products fetched:', results); // Debugging

        // Ensure you're passing the correct variable name, e.g., 'products' 
        res.render('index', { product: results }); 
    }); 
}; 

exports.getProducts = (req, res) => { 
    const sql = 'SELECT * FROM product'; 
    db.query(sql, (error, results) => { 
        if (error) { 
            console.error('Database query error:', error.message);  
            return res.status(500).send('Error retrieving products');  
        } 

        console.log('Products fetched:', results); // Debugging

        // Ensure you're passing the correct variable name, e.g., 'products' 
        res.render('products', { product: results }); 
    }); 
}; 

exports.getproduct = (req, res) => {
    const ProductID = req.params.id;
    
    const productSql = `
        SELECT p.*, 
               COALESCE(AVG(r.reviewRating), 0) as averageRating,
               COUNT(r.reviewId) as reviewCount
        FROM product p
        LEFT JOIN reviews r ON p.ProductID = r.ProductID
        WHERE p.ProductID = ?
        GROUP BY p.ProductID
    `;

    const reviewsSql = `
        SELECT r.reviewId, r.reviewContent, r.reviewRating, 
               r.reviewImage, r.reviewDate, 
               u.FirstName, u.LastName, u.Image as userImage
        FROM reviews r
        JOIN user u ON r.reviewedByUserId = u.UserID
        WHERE r.ProductID = ?
        ORDER BY r.reviewDate DESC
    `;

    db.query(productSql, [ProductID], (error, productResults) => {
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).send('Error retrieving product details');
        }

        if (productResults.length === 0) {
            return res.status(404).send('Product not found');
        }

        db.query(reviewsSql, [ProductID], (reviewError, reviewResults) => {
            if (reviewError) {
                console.error('Database query error:', reviewError);
                return res.status(500).send('Error retrieving reviews');
            }

            res.render('productDetail', {
                product: productResults[0],
                reviews: reviewResults,
                user: req.session.user
            });
        });
    });
};


exports.getAdminPage = (req, res) => {
    const sql = 'SELECT * FROM product'; 
    db.query(sql, (error, results) => { 
    if (error) { 
        console.error('Database query error:', error.message);  
        return res.status(500).send('Error retrieving products');  
    } 
    console.log('Products fetched:', results); // Debugging
    // Ensure you're passing the correct variable name, e.g., 'products' 
    res.render('adminpage', { product: results }); 
}); 
}; 

exports.addProductForm = (req, res) => {
    const sql = 'SELECT * FROM category';
    // Fetch data from MySQL
    db.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving categories');
        }

        if (results.length > 0) {
            console.log('All categories:', results[0].CategoryID);
            res.render('addProduct', { category: results });
        } else {
            res.status(404).send('No Categories');
        }
    });
};

exports.addProduct = (req, res) => {
    const { Name, Description, Price, Size, Stock, CategoryID } = req.body;
    let Image = null, Image1 = null, Image2 = null, Image3 = null;

    // Assuming `req.files` is used for multiple image uploads
    if (req.files && req.files.length > 0) {
        // Assign the first file to `Image`
        Image = req.files[0]?.filename || null;
        // Assign subsequent files to other fields
        Image1 = req.files[1]?.filename || null;
        Image2 = req.files[2]?.filename || null;
        Image3 = req.files[3]?.filename || null;
    }

    const sql = `
        INSERT INTO product (Name, Description, Image, Image1, Image2, Image3, Price, Size, Stock, CategoryID)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Insert the new product into the database
    db.query(sql, [Name, Description, Image, Image1, Image2, Image3, Price, Size, Stock, CategoryID], (error, results) => {
        if (error) {
            console.error("Error adding product:", error);
            res.status(500).send('Error adding product');
        } else {
            res.redirect('/adminpage');
        }
    });
};

// Fetch all categories using a callback
const getAllCategories = (db, callback) => {
    const sql = 'SELECT * FROM category';

    // Fetch data from MySQL
    db.query(sql, (error, results) => {
        if (error) {
            return callback(error, null); // Call callback with error
        }

        if (results.length > 0) {
            return callback(null, results); // Call callback with categories
        } else {
            return callback(null, []); // No categories found, return empty array
        }
    });
};

exports.editProductForm = async (req, res) => {
    const ProductId = req.params.id; // This should match the product ID in the URL
    
    // Fetch categories and product details by ProductID
    getAllCategories(db, (categoryError, category) => {
        if (categoryError) {
            console.error('Error retrieving categories:', categoryError.message);
            return res.status(500).send('Error retrieving categories');
        }

        const sql = 'SELECT * FROM product WHERE ProductID = ?';
        db.query(sql, [ProductId], (productError, results) => {
            if (productError) {
                console.error('Database query error:', productError.message);
                return res.status(500).send('Error retrieving product by ID');
            }

            if (results.length > 0) {
                res.render('editProduct', { product: results[0], category: category });
            } else {
                res.status(404).send('Product not found');
            }
        });
    });
};

exports.editProduct = (req, res) => {
    const ProductID = req.params.id;
    const { Name, Description, Price, Size, Stock, CategoryID } = req.body;
    let { currentImage, currentImage1, currentImage2, currentImage3 } = req.body; // Retrieve current images
    
    // Initialize images to current ones if no new ones are uploaded
    let Image = currentImage || '';
    let Image1 = currentImage1 || '';
    let Image2 = currentImage2 || '';
    let Image3 = currentImage3 || '';

    if (req.files && req.files.length > 0) {
        // Assign the first file to `Image`
        Image = req.files[0]?.filename || null;
        // Assign subsequent files to other fields
        Image1 = req.files[1]?.filename || null;
        Image2 = req.files[2]?.filename || null;
        Image3 = req.files[3]?.filename || null;
    }

    const sql = `
        UPDATE product
        SET 
            Name = ?, 
            Description = ?, 
            Image = ?, 
            Image1 = ?, 
            Image2 = ?, 
            Image3 = ?, 
            Price = ?, 
            Size = ?, 
            Stock = ?, 
            CategoryID = ?  
        WHERE ProductID = ? 
    `;

    // Execute the query
    db.query(
        sql,
        [Name, Description, Image, Image1, Image2, Image3, Price, Size, Stock, CategoryID, ProductID],
        (error, results) => {
            if (error) {
                console.error("Error updating product:", error);
                res.status(500).send('Error updating product');
            } else {
                console.log("Product updated successfully:", results);
                res.redirect('/adminpage');
            }
        }
    );
};

//delete product
exports.deleteProduct = (req, res) => {
    const ProductID = req.params.id;
    const sql = 'DELETE FROM product WHERE ProductID = ?';
    db.query(sql, [ProductID], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error deleting product:", error);
            res.status(500).send('Error deleting product');
        } else {
            // Send a success response
            res.redirect('/adminpage');
        }
    });
}

