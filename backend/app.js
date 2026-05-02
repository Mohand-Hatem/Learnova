import express from "express";

const app = express();
app.use(express.json());
app.listen(Env.PORT || 5000, () => {
  console.log("Server running on port 5000");
});
export default app;
