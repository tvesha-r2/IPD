const express = require("express");
const { authRequired } = require("../middleware/auth");
const categoryController = require("../controllers/categoryController");

const router = express.Router();

router.use(authRequired);

router.get("/", categoryController.list);
router.post("/", categoryController.create);
router.get("/:id", categoryController.getOne);
router.patch("/:id", categoryController.update);
router.delete("/:id", categoryController.remove);

module.exports = router;

