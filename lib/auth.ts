import { kv } from '@vercel/kv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface UserWithPassword extends User {
  passwordHash: string
}

// Generate unique user ID
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Create new user
export async function createUser(email: string, password: string, name: string): Promise<User> {
  // Check if user already exists
  const existingUser = await kv.get(`user:${email}`)
  if (existingUser) {
    throw new Error('User already exists')
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const userId = generateUserId()
  
  const user: UserWithPassword = {
    id: userId,
    email,
    name,
    passwordHash: hashedPassword,
    createdAt: new Date().toISOString()
  }
  
  // Store user data
  await kv.set(`user:${email}`, user)
  await kv.set(`user:id:${userId}`, user)
  
  // Return user without password
  const { passwordHash, ...userWithoutPassword } = user
  return userWithoutPassword
}

// Validate user credentials
export async function validateUser(email: string, password: string): Promise<User | null> {
  const userData = await kv.get(`user:${email}`) as UserWithPassword | null
  
  if (!userData || !await bcrypt.compare(password, userData.passwordHash)) {
    return null
  }
  
  const { passwordHash, ...user } = userData
  return user
}

// Create session token
export async function createSession(user: User): Promise<string> {
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
  
  const cookieStore = await cookies()
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/'
  })
  
  return token
}

// Get current session
export async function getSession(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) return null
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
    const userData = await kv.get(`user:id:${decoded.userId}`) as UserWithPassword | null
    
    if (!userData) return null
    
    const { passwordHash, ...user } = userData
    return user
  } catch (error) {
    return null
  }
}

// Logout user
export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}