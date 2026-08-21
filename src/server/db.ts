import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

type GlobalWithMongoose = typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const globalForMongoose = globalThis as GlobalWithMongoose;

const cache: MongooseCache = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};

globalForMongoose.mongooseCache = cache;

export default async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI env variable");

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri);
  }

  cache.conn = await cache.promise;
  return cache.conn;
}