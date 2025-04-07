import 'dotenv/config'

import * as expressModule from "express";
const express = expressModule.default;

const app = express();

const PORT = 3000;

const a = "a";


app.listen(PORT, () => {
  console.log(`Running on Port ${PORT}`);
});

export default app