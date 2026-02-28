import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };

if (process.env.NODE_ENV !== "production") {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error(
      "Please define the MONGO_URI environment variable inside .env.local"
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = { bufferCommands: false };
    cached.promise = mongoose.connect(MONGO_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  // One-time migration: drop old team unique indexes so partial indexes from Team model can apply
  const migrationKey = "teams_index_migration_v1";
  if (!(global as Record<string, unknown>)[migrationKey]) {
    (global as Record<string, unknown>)[migrationKey] = true;
    const coll = cached.conn.connection.db?.collection("teams");
    if (coll) {
      for (const name of ["teamName_1_tournamentDate_1", "teamName_1_tournamentId_1"]) {
        try {
          await coll.dropIndex(name);
        } catch (e: unknown) {
          const err = e as { code?: number };
          if (err?.code !== 27) throw e; // 27 = index not found
        }
      }
    }
  }

  return cached.conn;
}

export { connectDB };
export default connectDB;
