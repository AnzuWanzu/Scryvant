import { Router } from "express";
import userRoutes from "./userRoutes";
import characterRoutes from "./characterRoutes";

const appRouter = Router();

appRouter.use("/user", userRoutes);
appRouter.use("/character", characterRoutes);

export default appRouter;
