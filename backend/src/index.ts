import app from "./app";
import { connectDB } from "./db/connection";

const PORT = process.env.PORT;

connectDB()
  .then(() => {
    app.listen(PORT, () =>
      console.log(
        `Connected to Server and MongoDB |
         Listening on port: ${PORT}`,
      ),
    );
  })
  .catch((error) => {
    console.log(error);
  });
