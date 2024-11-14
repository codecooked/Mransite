// Environment configuration
require('dotenv').config();

// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const validator = require('validator');
const mailgun = require('mailgun-js');
const { MongoClient, ObjectId } = require('mongodb');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB URI and Client setup
const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);

// Database collections
let db;
let usersCollection;
let tokensCollection;

// Database connection function
async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        db = client.db('test');
        usersCollection = db.collection('users');
        tokensCollection = db.collection('tokens');

        // Create indexes for performance
        await usersCollection.createIndex({ email: 1 }, { unique: true });
        await tokensCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 }); // 1 hour expiry
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
}
connectToDatabase();

// Middleware configurations
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(helmet());

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: mongoUri }),
        cookie: {
            sameSite: 'strict',
            maxAge: 30 * 60 * 1000 // 30 minutes session expiry
        }
    })
);
// Enable the trust proxy setting
app.set('trust proxy', true);

// Your rate limiter setup
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

// Apply rate limiting to all requests
app.use(limiter);
// Input Validation Middleware
const validateSignupInput = (req, res, next) => {
    const { email, password } = req.body;
    if (!validator.isEmail(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (!isValidPassword(password)) {
        return res.status(400).json({ success: false, message: 'Password does not meet requirements' });
    }
    next();
};

// Rate limiting for login route
const loginLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again after 30 minutes.'
});

// Mailgun configuration
const mg = mailgun({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN });

// Helper functions
function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

function isValidPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return passwordRegex.test(password);
}

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Bawal access.' });
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(__dirname + '/public/forgot-password.html');
});

app.get('/reset-password', (req, res) => {
    res.sendFile(__dirname + '/public/reset-password.html');
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/public/signup.html');
});

// Forgot Password endpoint
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send('Email is required');
    }

    try {
        const resetToken = generateRandomString(32);
        const tokenDoc = {
            email: email,
            token: resetToken,
            createdAt: new Date()
        };

        await tokensCollection.updateOne(
            { email: email },
            { $set: tokenDoc },
            { upsert: true }
        );

        res.status(200).json({ message: 'Password reset token generated and saved' });
    } catch (error) {
        console.error('Error processing forgot-password request:', error);
        res.status(500).json({ message: 'Error processing request' });
    }
});

// Send Reset Code Email
async function sendResetCodeEmail(email, resetCode) {
    const data = {
        from: 'dhannaholec@gmail.com',
        to: email,
        subject: 'Your Password Reset Code',
        text: `Your password reset code is: ${resetCode}`,
        html: `<p>Your password reset code is:</p><h3>${resetCode}</h3>`,
    };
    try {
        await mg.messages().send(data);
        console.log(`Reset code email sent to ${email}`);
    } catch (error) {
        console.error('Error sending reset code email:', error);
        throw new Error('Error sending reset code email');
    }
}

// Send Password Reset endpoint
app.post('/send-password-reset', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await usersCollection.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: 'No account with that email exists' });
        }

        const resetCode = generateCode();
        const resetExpires = new Date(Date.now() + 3600000); // 1-hour expiry

        await usersCollection.updateOne(
            { email: email },
            {
                $set: {
                    resetKey: resetCode,
                    resetExpires: resetExpires
                }
            }
        );

        await sendResetCodeEmail(email, resetCode);
        res.json({ message: 'Password reset code sent', redirectUrl: '/reset-password.html' });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ message: 'Error processing request' });
    }
});

// Reset Password endpoint
app.post('/reset-password', async (req, res) => {
    const { resetKey, newPassword } = req.body;

    try {
        const user = await usersCollection.findOne({
            resetKey: resetKey,
            resetExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset key.' });
        }

        const hashedPassword = hashPassword(newPassword);
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: { password: hashedPassword },
                $unset: { resetKey: "", resetExpires: "" }
            }
        );

        res.json({ success: true, message: 'Your password has been successfully reset.' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ success: false, message: 'Error resetting password' });
    }
});

// Sign Up route
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user already exists
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // Validate password strength (optional)
    if (!isValidPassword(password)) {
      return res.status(400).json({ success: false, message: 'Password does not meet complexity requirements.' });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the new user object
    const newUser = {
      email,
      password: hashedPassword,
      createdAt: new Date()
    };

    // Insert the new user into the database
    const insertResult = await usersCollection.insertOne(newUser);

    // Check if the insert operation was successful
    if (insertResult.acknowledged) {
      res.json({ success: true, message: 'Account created successfully!' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create account.' });
    }
  } catch (error) {
    console.error('Error creating account:', error.stack || error);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});
function isValidPassword(password) {
    // Example: Password must be at least 8 characters, contain letters and numbers
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return passwordRegex.test(password);
  }
  async function hashPassword(password) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  }

// Login route
app.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }

        const user = await usersCollection.findOne({ email: email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
            const remainingTime = Math.ceil((user.accountLockedUntil - new Date()) / 60000);
            return res.status(403).json({ success: false, message: `Account is locked. Try again in ${remainingTime} minutes.` });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            let invalidAttempts = (user.invalidLoginAttempts || 0) + 1;
            let updateFields = { invalidLoginAttempts: invalidAttempts };

            if (invalidAttempts >= 3) {
                updateFields.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
                updateFields.invalidLoginAttempts = 0;
                await usersCollection.updateOne({ _id: user._id }, { $set: updateFields });

                return res.status(403).json({ success: false, message: 'Account is locked due to multiple failed login attempts. Please try again after 30 minutes.' });
            } else {
                await usersCollection.updateOne({ _id: user._id }, { $set: updateFields });
                return res.status(400).json({ success: false, message: 'Invalid email or password.' });
            }
        }

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    invalidLoginAttempts: 0,
                    accountLockedUntil: null,
                    lastLoginTime: new Date()
                }
            }
        );

        req.session.userId = user._id;
        req.session.email = user.email;
        req.session.role = user.role;
        req.session.studentIDNumber = user.studentIDNumber;

        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        res.json({ success: true, role: user.role, message: 'Login successful!' });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, message: 'Error during login.' });
    }
});

// Logout route
app.post('/logout', async (req, res) => {
    if (!req.session.userId) {
        return res.status(400).json({ success: false, message: 'No user is logged in.' });
    }

    try {
        req.session.destroy(err => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).json({ success: false, message: 'Logout failed.' });
            }

            res.clearCookie('connect.sid');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');

            return res.json({ success: true, message: 'Logged out successfully.' });
        });
    } catch (error) {
        console.error('Error during logout:', error);
        return res.status(500).json({ success: false, message: 'Failed to log out.' });
    }
});

// User details route
app.get('/user-details', isAuthenticated, async (req, res) => {
    try {
        const email = req.session.email;
        if (!email) {
            return res.status(401).json({ success: false, message: 'Unauthorized access.' });
        }

        const user = await usersCollection.findOne({ email: email }, { projection: { email: 1 } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.json({
            success: true,
            user: { email: user.email }
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ success: false, message: 'Error fetching user details.' });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await client.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
});
