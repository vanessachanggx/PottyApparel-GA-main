const db = require('../db');

// Get all reviews
exports.getReviews = (req, res) => {
    const sql = `
        SELECT r.reviewId, r.reviewContent, r.reviewRating, r.reviewImage, 
               r.reviewedByUserId, u.FirstName, u.LastName, p.Name as productName, 
               p.Image as productImage 
        FROM reviews r
        JOIN user u ON r.reviewedByUserId = u.UserID
        JOIN product p ON r.ProductID = p.ProductID
        ORDER BY r.reviewDate DESC
    `;

    db.query(sql, (error, results) => {
        if (error) {
            console.error('Error retrieving reviews:', error);
            return res.status(500).send('Error retrieving reviews');
        }

        res.render('reviews', { 
            reviews: results,
            user: req.session.user 
        });
    });
};

exports.getProductReviews = (req, res) => {
    const productId = req.params.id;
    
    // First get product details
    const productSql = 'SELECT * FROM product WHERE ProductID = ?';
    
    db.query(productSql, [productId], (error, productResults) => {
        if (error) {
            console.error('Error retrieving product:', error);
            return res.status(500).send('Error retrieving product');
        }

        if (productResults.length === 0) {
            return res.status(404).send('Product not found');
        }

        // Then get reviews
        const reviewsSql = `
            SELECT r.reviewId, r.reviewContent, r.reviewRating, 
                   r.reviewImage, r.reviewDate,
                   u.FirstName, u.LastName
            FROM reviews r
            JOIN user u ON r.reviewedByUserId = u.UserID
            WHERE r.ProductID = ?
            ORDER BY r.reviewDate DESC
        `;

        db.query(reviewsSql, [productId], (reviewError, reviewResults) => {
            if (reviewError) {
                console.error('Error retrieving reviews:', reviewError);
                return res.status(500).send('Error retrieving reviews');
            }

            res.render('productDetail', {
                product: productResults[0],
                reviews: reviewResults || [], // Provide empty array if no reviews
                user: req.session.user
            });
        });
    });
};

exports.addReview = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const productId = req.params.id;
    const { reviewContent, reviewRating } = req.body;
    const userId = req.session.user.UserID;
    
    // Handle image upload
    let reviewImage = null;
    if (req.file) {
        // Save the complete filename with timestamp to avoid duplicates
        reviewImage = Date.now() + '-' + req.file.originalname;
        
        // Move the uploaded file to the public/images directory
        const fs = require('fs');
        const oldPath = req.file.path;
        const newPath = 'public/images/' + reviewImage;
        
        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                console.error('Error moving file:', err);
                return res.status(500).send('Error uploading image');
            }
        });
    }

    const sql = `
        INSERT INTO reviews (
            reviewContent, 
            reviewRating, 
            reviewImage, 
            reviewedByUserId, 
            ProductID,
            reviewDate
        ) VALUES (?, ?, ?, ?, ?, NOW())
    `;

    db.query(sql, [
        reviewContent, 
        reviewRating, 
        reviewImage, 
        userId, 
        productId
    ], (error, results) => {
        if (error) {
            console.error('Error adding review:', error);
            return res.status(500).send('Error adding review');
        }
        res.redirect(`/product/${productId}`);
    });
};

// Edit review form route handler
exports.editReviewForm = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const reviewId = req.params.id;
    const sql = `
        SELECT r.reviewId, r.reviewContent, r.reviewRating, r.reviewImage,
               r.ProductID, p.Name as productName, p.Image as productImage
        FROM reviews r
        JOIN product p ON r.ProductID = p.ProductID
        WHERE r.reviewId = ? AND r.reviewedByUserId = ?
    `;

    db.query(sql, [reviewId, req.session.user.UserID], (error, results) => {
        if (error) {
            console.error('Error retrieving review:', error);
            return res.status(500).send('Error retrieving review');
        }

        if (results.length === 0) {
            return res.status(404).send('Review not found or unauthorized');
        }

        res.render('editReview', {
            review: results[0],
            user: req.session.user
        });
    });
};

// Edit review submission handler
exports.editReview = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const reviewId = req.params.id;
    const { reviewContent, reviewRating, ProductID } = req.body;
    let reviewImage = req.body.currentReviewImage;

    if (req.file) {
        reviewImage = Date.now() + '-' + req.file.originalname;
        const fs = require('fs');
        const oldPath = req.file.path;
        const newPath = 'public/images/' + reviewImage;
        
        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                console.error('Error moving file:', err);
                return res.status(500).send('Error uploading image');
            }
        });
    }

    const sql = `
        UPDATE reviews 
        SET reviewContent = ?, 
            reviewRating = ?, 
            reviewImage = ?,
            reviewDate = NOW()
        WHERE reviewId = ? 
        AND reviewedByUserId = ?
    `;

    db.query(sql, [
        reviewContent, 
        reviewRating, 
        reviewImage, 
        reviewId,
        req.session.user.UserID
    ], (error, results) => {
        if (error) {
            console.error('Error updating review:', error);
            return res.status(500).send('Error updating review');
        }
        res.redirect(`/product/${ProductID}`);
    });
};

// Delete review handler
exports.deleteReview = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const reviewId = req.params.id;
    
    // First get the ProductID before deleting
    const getProductSql = `
        SELECT ProductID FROM reviews 
        WHERE reviewId = ? AND reviewedByUserId = ?
    `;

    db.query(getProductSql, [reviewId, req.session.user.UserID], (error, results) => {
        if (error) {
            console.error('Error retrieving review:', error);
            return res.status(500).send('Error retrieving review');
        }

        if (results.length === 0) {
            return res.status(404).send('Review not found or unauthorized');
        }

        const ProductID = results[0].ProductID;

        // Then delete the review
        const deleteSql = `
            DELETE FROM reviews 
            WHERE reviewId = ? 
            AND reviewedByUserId = ?
        `;

        db.query(deleteSql, [reviewId, req.session.user.UserID], (deleteError) => {
            if (deleteError) {
                console.error('Error deleting review:', deleteError);
                return res.status(500).send('Error deleting review');
            }
            res.redirect(`/product/${ProductID}`);
        });
    });
};
