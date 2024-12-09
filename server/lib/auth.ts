import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const SALT_ROUNDS = 10;

export async function loginUser(email: string, password: string) {
  // Find user by email using drizzle-orm
  const [user] = await db.select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error("Invalid password");
  }

  // Generate JWT token
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });

  // Return user info and token
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  };
}

export async function createUser(email: string, password: string, name: string) {
  // Check if user already exists
  const [existingUser] = await db.select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Create new user
  const [user] = await db.insert(users)
    .values({
      email,
      name: name || email.split("@")[0],
      password_hash: hashedPassword,
    })
    .returning();

  return user;
}

export function verifyToken(token: string): { userId: number } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
      return { userId: decoded.userId as number };
    }
    throw new Error("Invalid token payload");
  } catch (error) {
    throw new Error("Invalid token");
  }
}
