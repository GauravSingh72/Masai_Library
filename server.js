const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// mongodb+srv://gauravsingh:MXmOEw1XB9bYZZNC@gauravsinghcluster.kxnryue.mongodb.net/bookstore?retryWrites=true&w=majority

mongoose.connect(`mongodb+srv://gauravsingh:MXmOEw1XB9bYZZNC@gauravsinghcluster.kxnryue.mongodb.net/bookstore?retryWrites=true&w=majority`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("Connected to MongoDB"))
    .catch((error => console.error("Failed to connect to MongoDB")))

// User Model
const User = mongoose.model("User", {
    name: String,
    email: String,
    password: String,
    isAdmin: Boolean
})

// Book Model
const Book = mongoose.model("Book", {
    title: String,
    author: String,
    category: String,
    price: Number,
    quantity: Number
})

// Order Model 
const Order = mongoose.model("Order", {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    totalAmount: Number
})

// Middlewares 

const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];

    if (!token) {
        return res.status(401).json({ message: "Access Denied." })
    }

    jwt.verify(token, "secretKey", (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Access Denied." })
        }

        req.user = decoded;
        next();
    })
}

// API Routes

//Register

app.post(`/api/register`, async (req, res) => {
    const { name, email, password, isAdmin } = req.body;

    const hashPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashPassword, isAdmin });

    try {
        await user.save();
        res.status(201).json({ message: "User Registered Successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to Register user" })
    }
})

// Login
app.post(`/api/login`, async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ message: "User not Found" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid Password" });
    }

    const token = jwt.sign({ userId: user._id, isAdmin: user.isAdmin }, "secretKey");

    res.status(200).json({ token });
})

// Get All Books 

app.get(`/api/books`, async (req, res) => {
    try {
        const { category, author } = req.query;

        const query = {};

        if (category) {
            query.category = category
        }
        if (author) {
            query.author = author;
        }
        const books = await Book.find(query);
        res.status(200).json(books);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch Books" })
    }
})

// Get a book by specific ID

app.get(`/api/books/:id`, async (req, res) => {
    const { id } = req.params;
    try {
        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({ message: "Book Not Found" })
        }
        res.status(200).json(book);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch Books" })
    }
})

// Add a new Book
app.post(`/api/books`, async (req, res) => {
    const { title, author, category, price, quantity } = req.body;

    try {
        const book = new Book({ title, author, category, price, quantity });
        await book.save();
        res.status(201).json({ message: "Book Added Successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to add book" });
    }
})

// update a book

app.patch(`/api/books/:id`, async (req, res) => {
    const { id } = req.params;
    const { title, author, category, price, quantity } = req.body;

    try {
        const book = await Book.findByIdAndUpdate(id, { title, author, category, price, quantity });

        if (!book) {
            return res.status(404).json({ message: "Book Not Found" });
        }

        res.status(204).json({ message: "Book Updated Successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to update book" });
    }
})

// Delete a Book 
app.delete(`/api/books/:id`, async (req, res) => {
    const { id } = req.params;

    try {
        const book = await Book.findByIdAndDelete(id);

        if (!book) {
            return res.status(404).json({ message: "Book Not Found" });
        }
        res.status(202).json({ message: "Book Deleted Successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete book" });
    }
})

// Place an order
app.post(`/api/order`, async (req, res) => {
    const { books } = req.body;
    const user = req.userId;
    const orderBooks = await Book.find({ _id: { $in: books } });
    const totalAmount = orderBooks.reduce((total, book) => total + book.price, 0);
    const order = new Order({ user, books, totalAmount });
    await order.save();
    res.status(201).json({ message: "Order Place Successfully", order });
})

// Get order
app.get(`/api/order`, async (req, res) => {
    const orders = await Order.find().populate(`User`);
    res.status(200).json(orders);
})

app.listen(3000, () => {
    console.log("Server is running at port 3000")
})