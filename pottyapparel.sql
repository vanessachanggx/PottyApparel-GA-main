DROP TABLE IF EXISTS `orders`;


CREATE TABLE `orderitem` (
    `orderId` int NOT NULL AUTO_INCREMENT,
    `ProductID` int NOT NULL,
    `Quantity` int NOT NULL,
    `Price` decimal(10,2) NOT NULL,
    `Size` varchar(50) NOT NULL,
    `OrderDate` datetime NOT NULL,
    PRIMARY KEY (`orderId`),
    KEY `ProductID` (`ProductID`),
    CONSTRAINT `orderitem_product_fk` FOREIGN KEY (`ProductID`) REFERENCES `product` (`ProductID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT * FROM orderitem;

CREATE TABLE orders (
    OrderID INT AUTO_INCREMENT PRIMARY KEY, -- Unique ID for each order
    UserID INT NOT NULL, -- Reference to the user who placed the order
    TotalAmount DECIMAL(10, 2) NOT NULL, -- Total amount of the order
    OrderDate DATETIME NOT NULL, -- Date and time the order was placed
    Status VARCHAR(50) DEFAULT 'Pending', -- Status of the order (e.g., Pending, Completed, Canceled)
    FOREIGN KEY (UserID) REFERENCES user(UserID) ON DELETE CASCADE -- Links to the users table
);


