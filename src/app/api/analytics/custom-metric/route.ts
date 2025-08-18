import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, value, unit, url, timestamp } = data;

    // Store custom metric in database
    await prisma.systemMetrics.create({
      data: {
        metricName: `custom_${name}`,
        metricValue: value,
        timestamp: new Date(timestamp)
      }
    });

    console.log(`Custom metric stored: ${name} = ${value} ${unit}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Custom Metric API error:', error);
    return NextResponse.json(
      { error: 'Failed to store custom metric' },
      { status: 500 }
    );
  }
}