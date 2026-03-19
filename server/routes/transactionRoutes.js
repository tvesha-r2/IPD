const express = require("express");
const { authRequired } = require("../middleware/auth");
const txController = require("../controllers/transactionController");

const router = express.Router();

router.use(authRequired);

router.get("/", txController.list);
router.post("/", txController.create);
router.get("/summary", txController.summary);
router.get("/:id", txController.getOne);
router.patch("/:id", txController.update);
router.delete("/:id", txController.remove);

module.exports = router;

