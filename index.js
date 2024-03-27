const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const app = express();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://job-portal-cdfef.firebaseapp.com",
      "https://job-portal-client-peach.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const username = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
// console.log("Username: ", username);
// console.log("Password: ", password);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${username}:${password}@cluster0.yexdchm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log("Token: ", token);
  if (!token) {
    return res.status(404).send({ Message: "Unauthorized Access!!!" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(404).send({ Message: "Unauthorized Access!!!" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const userCollection = client.db("JobPortal").collection("users");
    const jobCollection = client.db("JobPortal").collection("jobs");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log("User: ", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });
    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
        })
        .send({ success: true });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      //   console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users", async (req, res) => {
      // const email = req.query.email;
      // console.log(req.query.email);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await userCollection.find(query).toArray();
      //   console.log(query);
      res.send(result);
    });

    app.post("/addJob", async (req, res) => {
      const newJob = req.body;
      // console.log(newJob);
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    });

    app.get("/allJobs", async (req, res) => {
      let query = {};
      if (req.query?.category) {
        query = { category: req.query.category };
      }
      const result = await jobCollection.find(query).toArray();

      // const result = await jobCollection.find().toArray();
      res.send(result);
    });
    app.get("/myJobs", verifyToken, async (req, res) => {
      // console.log("User: ", req.user.email);
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);

      // console.log("Page: ", page);
      // console.log("Size: ", size);
      const query = { email: req.query?.email };
      if (req.user.email !== req.query?.email) {
        return res.status(403).send({ message: "Invalid User" });
      }
      // if (req.query?.email) {
      //   query = { email: req.query.email };
      // }
      const result = await jobCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/allJobs/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/jobCount", async (req, res) => {
      const result = await jobCollection.estimatedDocumentCount();
      // console.log({ result });
      res.send({ result });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job Portal is running");
});

app.listen(port, () => {
  console.log(`Job-portal is running on: ${port}`);
});
