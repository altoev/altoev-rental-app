require('dotenv').config();
const { MongoClient } = require('mongodb');
const redis = require('redis');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.AZURE_COSMOS_CONNECTIONSTRING;
let db;

async function connectToMongo() {
  try {
    const mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    db = mongoClient.db('altoevRentalDB');
    console.log('Connected to Cosmos DB with MongoDB API');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
  }
}
connectToMongo();

// Connect to Redis
const redisClient = redis.createClient({
  url: process.env.AZURE_REDIS_CONNECTIONSTRING,
  socket: {
    tls: true,          // Ensure a secure connection using TLS
    connectTimeout: 20000,  // Increase timeout duration to 20 seconds
    keepAlive: 5000,    // Keep the connection alive with the server
    reconnectStrategy: retries => Math.min(retries * 50, 5000)  // Attempt reconnects
  }
});

redisClient.connect()
  .then(() => console.log('Connected to Azure Redis'))
  .catch(err => console.error('Redis connection error:', err));

redisClient.on('connect', () => {
  console.log('Redis client is attempting to connect...');
});

redisClient.on('ready', () => {
  console.log('Redis connection established successfully.');
});

redisClient.on('end', () => {
  console.log('Redis connection has been closed.');
});

// Vehicles Management API

// Get all vehicles
app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await db.collection('vehicles').find({}).toArray();
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicles', error });
  }
});

// Add a new vehicle
app.post('/api/vehicles', async (req, res) => {
  try {
    const newVehicle = req.body;
    const result = await db.collection('vehicles').insertOne(newVehicle);
    res.status(201).json({ message: 'Vehicle added successfully', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Error adding vehicle', error });
  }
});

// Reservation Management API

// Get all reservations
app.get('/api/reservations', async (req, res) => {
  try {
    const reservations = await db.collection('reservations').find({}).toArray();
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reservations', error });
  }
});

// Create a new reservation
app.post('/api/reservations', async (req, res) => {
  try {
    const newReservation = req.body;
    const result = await db.collection('reservations').insertOne(newReservation);
    res.status(201).json({ message: 'Reservation created successfully', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Error creating reservation', error });
  }
});

// Stripe payment endpoint
app.post('/api/payment', async (req, res) => {
  try {
    const { amount, currency, source } = req.body;

    const charge = await stripe.charges.create({
      amount,
      currency,
      source
    });

    res.status(200).json({ success: true, charge });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
