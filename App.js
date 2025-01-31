const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs")
require("dotenv").config(); // For environment variables

const app = express();

const port = 5000; // Backend runs on port 5000

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = "mongodb+srv://bowya:bowya123@cluster0.bftvl.mongodb.net/SwiggyProject";
mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Database connection failed:", err.message));

// User Schema & Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

// Restaurant Schema & Model
const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cuisine: { type: String, required: true },
  rating: { type: Number, required: true },
});
const Restaurant = mongoose.model("Restaurant", restaurantSchema);

// Menu Item Schema & Model
const menuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true }
});
const MenuItem = mongoose.model("MenuItem", menuItemSchema);

// Order Schema & Model
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  items: [{ name: String, price: Number }],
  totalPrice: { type: Number, required: true },
  status: { type: String, default: "Placed" }
});
const Order = mongoose.model("Order", orderSchema);

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error registering user", error: error.message });
  }
});


app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, "secret-key", { expiresIn: "12h" });
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});


const authorize = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, "secret-key", (error, userInfo) => {
    if (error) return res.status(401).json({ message: "Unauthorized" });
    req.user = userInfo;
    next();
  });
};


app.get("/api/restaurants", async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.status(200).json(restaurants);
  } catch (error) {
    res.status(500).json({ message: "Error fetching restaurants", error: error.message });
  }
});

app.post("/api/restaurants", authorize, async (req, res) => {
  const { name, cuisine, rating } = req.body;
  try {
    const newRestaurant = new Restaurant({ name, cuisine, rating });
    await newRestaurant.save();
    res.status(201).json({ message: "Restaurant added successfully", restaurant: newRestaurant });
  } catch (error) {
    res.status(500).json({ message: "Error adding restaurant", error: error.message });
  }
});


app.get("/api/menu/:restaurantId", async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ restaurantId: req.params.restaurantId });
    res.status(200).json(menuItems);
  } catch (error) {
    res.status(500).json({ message: "Error fetching menu", error: error.message });
  }
});


app.post("/api/menu", authorize, async (req, res) => {
  const { restaurantId, name, price } = req.body;
  try {
    const newMenuItem = new MenuItem({ restaurantId, name, price });
    await newMenuItem.save();
    res.status(201).json({ message: "Menu item added", menuItem: newMenuItem });
  } catch (error) {
    res.status(500).json({ message: "Error adding menu item", error: error.message });
  }
});


app.post("/api/orders", authorize, async (req, res) => {
  const { restaurantId, items, totalPrice } = req.body;
  try {
    const newOrder = new Order({ userId: req.user.userId, restaurantId, items, totalPrice });
    await newOrder.save();
    res.status(201).json({ message: "Order placed", order: newOrder });
  } catch (error) {
    res.status(500).json({ message: "Error placing order", error: error.message });
  }
});


app.get("/api/orders", authorize, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders", error: error.message });
  }
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
