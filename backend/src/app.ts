import express from "express";
import { config } from "dotenv";
import appRouter from "./routes/appRoutes";

config();
const app = express();

app.use("/api/v1", appRouter);

export default app;
