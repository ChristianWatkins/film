import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET endpoint to fetch all festivals
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const festivalsDir = path.join(process.cwd(), 'data', 'festivals');
    const festivalNames = fs.readdirSync(festivalsDir);
    
    const festivals = festivalNames
      .filter(name => {
        const stat = fs.statSync(path.join(festivalsDir, name));
        return stat.isDirectory();
      })
      .map(name => {
        const festivalPath = path.join(festivalsDir, name);
        const yearFiles = fs.readdirSync(festivalPath)
          .filter(file => file.endsWith('.json'))
          .map(file => file.replace('.json', ''));
        
        return {
          name,
          years: yearFiles.sort()
        };
      });
    
    return NextResponse.json({ festivals });
  } catch (error) {
    console.error('Error loading festivals:', error);
    return NextResponse.json({ error: 'Failed to load festivals' }, { status: 500 });
  }
}

