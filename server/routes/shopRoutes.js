const express = require("express");
const router = express.Router();
const { setupShop,  getShopByUserId} = require("../controllers/shopController");
const authenticate = require("../middlewares/authenticate");

router.post("/setup", authenticate, setupShop);
router.get("/:userId", authenticate, getShopByUserId);

module.exports = router;
