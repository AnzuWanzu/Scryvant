import { Router } from "express";

import { getAllUsers } from "../controllers/userControllers";

const userRoutes = Router();

userRoutes.get("/", getAllUsers);

export default userRoutes;
