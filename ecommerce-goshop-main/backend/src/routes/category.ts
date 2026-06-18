import { Router } from "express";
import { getSingleCategory, getAllCategories } from "../controllers/category";
import { validateIdParam, validatePagination } from "../middleware/validate";
const router = Router();

router.get("/", validatePagination, getAllCategories);
router.get("/:id", validateIdParam("id"), getSingleCategory);

export default router;