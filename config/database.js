const mongoClient = new MongoClient(mongoUri);
await mongoClient.connect();

module.exports = client;
