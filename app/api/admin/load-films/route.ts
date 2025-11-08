import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const filmsPath = path.join(process.cwd(), 'data/films.json');
    const content = await fs.readFile(filmsPath, 'utf-8');
    const data = JSON.parse(content);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading films:', error);
    return NextResponse.json({ error: 'Failed to load films' }, { status: 500 });
  }
}

