import { NextResponse } from 'next/server'
import getApiDocs from '@/lib/swagger'

export const dynamic = 'force-static'

export async function GET() {
  try {
    const spec = await getApiDocs()
    return NextResponse.json(spec)
  } catch (error) {
    console.error('Error generating Swagger spec:', error)
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    )
  }
}
