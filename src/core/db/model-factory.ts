import mongoose, { type Model, type Schema } from 'mongoose';

// Test runners (Vitest) re-evaluate our own source modules per test file while mongoose itself
// stays a shared singleton process-wide, so a bare `mongoose.model(name, schema)` call collides
// with "Cannot overwrite model once compiled" on the second file. Reusing an already-registered
// model is also just correct behavior generally, not merely a test workaround.
export function getOrCreateModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema);
}
