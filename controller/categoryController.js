const db = require('../db');

exports.getCategories = (req, res) => {
    const sql = 'SELECT * FROM category';
    // Fetch data from MySQL
    db.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving categories');
        }

        if (results.length > 0) {
            console.log('All categories:', results[0].Name);
            res.render('categories', { category: results });
        } else {
            // If no category with the given ID was found, 
            //render a 404 page or handle it accordingly
            res.status(404).send('No Categories');
        }
    });
};

exports.getCategory = (req, res) => {
    const CategoryID = req.params.id;

    // Query to fetch category details
    const categoryQuery = 'SELECT * FROM category WHERE CategoryID = ?';

    // Query to fetch products linked to the category
    const productsQuery = 'SELECT * FROM product WHERE CategoryID = ?';

    // Fetch category details
    db.query(categoryQuery, [CategoryID], (categoryError, categoryResults) => {
        if (categoryError) {
            console.error('Database query error (category):', categoryError.message);
            return res.status(500).send('Error retrieving category by ID');
        }

        // Check if category exists
        if (categoryResults.length > 0) {
            const category = categoryResults[0];

            // Fetch products for the given category
            db.query(productsQuery, [CategoryID], (productsError, productsResults) => {
                if (productsError) {
                    console.error('Database query error (products):', productsError.message);
                    return res.status(500).send('Error retrieving products for the category');
                }

                // Render the category page with category and product data
                res.render('category', {
                    category: category,
                    products: productsResults
                });
            });
        } else {
            // If no category is found, render a 404 page or handle it accordingly
            res.status(404).send('Category not found');
        }
    });
};

exports.getAdminCategories = (req, res) => {
    const sql = 'SELECT * FROM category';
    // Fetch data from MySQL
    db.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving categories');
        }

        if (results.length > 0) {
            console.log('All categories:', results[0].Name);
            res.render('adminCategories', { category: results });
        } else {
            // If no category with the given ID was found, 
            //render a 404 page or handle it accordingly
            res.status(404).send('No Categories');
        }
    });
};

exports.getAdminCategory = (req, res) => {
    const CategoryID = req.params.id;

    // Query to fetch category details
    const categoryQuery = 'SELECT * FROM category WHERE CategoryID = ?';

    // Query to fetch products linked to the category
    const productsQuery = 'SELECT * FROM product WHERE CategoryID = ?';

    // Fetch category details
    db.query(categoryQuery, [CategoryID], (categoryError, categoryResults) => {
        if (categoryError) {
            console.error('Database query error (category):', categoryError.message);
            return res.status(500).send('Error retrieving category by ID');
        }

        // Check if category exists
        if (categoryResults.length > 0) {
            const category = categoryResults[0];

            // Fetch products for the given category
            db.query(productsQuery, [CategoryID], (productsError, productsResults) => {
                if (productsError) {
                    console.error('Database query error (products):', productsError.message);
                    return res.status(500).send('Error retrieving products for the category');
                }

                // Render the category page with category and product data
                res.render('adminCategory', {
                    category: category,
                    products: productsResults
                });
            });
        } else {
            // If no category is found, render a 404 page or handle it accordingly
            res.status(404).send('Category not found');
        }
    });
};

exports.addCategoryForm = (req, res) => {
    res.render('addCategory');
};

exports.addCategory = (req, res) => {
    const { Name, Description } = req.body;
    let Image;
    if (req.file) {
        Image = req.file.filename; // Save only the filename
    } else {
        Image = null;
    }

    const sql = 'INSERT INTO category (Name, Description, Image) VALUES (?, ?, ?)';

    // Insert the new category into the database
    db.query(sql, [Name, Description, Image], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error adding category:", error);
            res.status(500).send('Error adding Category');
        } else {
            // Send a success response
            res.redirect('/admin/categories');
        }
    });
};


//edit category form 
exports.editCategoryForm = (req, res) => {
    const CategoryID = req.params.id;
    const sql = 'SELECT * FROM category WHERE CategoryID = ?';
    //const category = db.Category.findByPk(categoryId);

    db.query(sql, [CategoryID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving category by ID');
        }

        // Check if any category with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the category data
            res.render('editCategory', { category: results[0] });
        } else {
            // If no category with the given ID was found, 
            //render a 404 page or handle it accordingly
            res.status(404).send('Category not found');
        }
    });

};

//edit category form processing
exports.editCategory = (req, res) => {

    const CategoryID = req.params.id;
    const { Name, Description } = req.body;

    let Image = req.body.currentImage; //retrieve current image filename
    if (req.file) { //if new image is uploaded
        Image = req.file.filename; // set image to be new image filename
    }
    console.log("new file: " + Image);
    const sql = 'UPDATE category SET Name = ?, Description = ?, Image = ? WHERE CategoryID = ?';


    // Insert the new category into the database
    db.query(sql, [Name, Description, Image, CategoryID], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error updating category:", error);
            res.status(500).send('Error updating category');
        } else {
            // Send a success response
            res.redirect('/admin/categories');
        }
    });

};

//delete category
exports.deleteCategory = (req, res) => {
    const CategoryID = req.params.id;
    const sql = 'DELETE FROM category WHERE CategoryID = ?';
    db.query(sql, [CategoryID], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error deleting category:", error);
            res.status(500).send('Error deleting category');
        } else {
            // Send a success response
            res.redirect('/admin/categories');
        }
    });
}