import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set");
}
const SALT_ROUNDS = 10;

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "24h" });
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

export async function createUser(email: string, password: string, name: string) {
  const hashedPassword = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      email,
      name: name || email.split("@")[0],
      password_hash: hashedPassword,
    })
    .returning();
  return user;
}

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResponse> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || !user.password_hash) {
    throw new Error("Invalid credentials");
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  const token = generateToken(user.id);
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}
