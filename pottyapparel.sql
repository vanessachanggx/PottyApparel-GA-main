DROP TABLE IF EXISTS `orderitem`;

CREATE TABLE `orderitem` (
    `OrderItemID` int NOT NULL AUTO_INCREMENT,
    `ProductID` int NOT NULL,
    `Quantity` int NOT NULL,
    `Price` decimal(10,2) NOT NULL,
    `Size` varchar(50) NOT NULL,
    `OrderDate` datetime NOT NULL,
    PRIMARY KEY (`OrderItemID`),
    KEY `ProductID` (`ProductID`),
    CONSTRAINT `orderitem_product_fk` FOREIGN KEY (`ProductID`) REFERENCES `product` (`ProductID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT * FROM orderitem;

