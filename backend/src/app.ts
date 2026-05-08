import express from "express";
import { config } from "dotenv";
import appRouter from "./routes/appRoutes";

config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", appRouter);

export default app;
