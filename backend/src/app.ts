import express from "express";
import { config } from "dotenv";
import appRouter from "./routes/appRoutes";
import cookieParser from "cookie-parser";

config();
const app = express();

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use("/api/v1", appRouter);

export default app;
