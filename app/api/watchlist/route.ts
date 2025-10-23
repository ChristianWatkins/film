import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserWatchlist, addToWatchlist, removeFromWatchlist } from '@/lib/server-watchlist'

// Get user's watchlist
export async function GET() {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const watchlist = await getUserWatchlist(user.id)
    
    return NextResponse.json({
      success: true,
      watchlist
    })
    
  } catch (error) {
    console.error('Get watchlist error:', error)
    return NextResponse.json(
      { error: 'Failed to get watchlist' },
      { status: 500 }
    )
  }
}

// Add film to watchlist
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { filmKey, filmTitle } = await request.json()
    
    if (!filmKey || !filmTitle) {
      return NextResponse.json(
        { error: 'filmKey and filmTitle are required' },
        { status: 400 }
      )
    }
    
    await addToWatchlist(user.id, filmKey, filmTitle)
    
    return NextResponse.json({
      success: true,
      message: 'Film added to watchlist'
    })
    
  } catch (error) {
    console.error('Add to watchlist error:', error)
    return NextResponse.json(
      { error: 'Failed to add film to watchlist' },
      { status: 500 }
    )
  }
}

// Remove film from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const filmKey = searchParams.get('filmKey')
    
    if (!filmKey) {
      return NextResponse.json(
        { error: 'filmKey is required' },
        { status: 400 }
      )
    }
    
    await removeFromWatchlist(user.id, filmKey)
    
    return NextResponse.json({
      success: true,
      message: 'Film removed from watchlist'
    })
    
  } catch (error) {
    console.error('Remove from watchlist error:', error)
    return NextResponse.json(
      { error: 'Failed to remove film from watchlist' },
      { status: 500 }
    )
  }
}