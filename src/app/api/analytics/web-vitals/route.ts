import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { cacheUtils } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { metrics, url, userAgent, timestamp } = data;

    // Store metrics in database for analysis
    for (const metric of metrics) {
      await prisma.systemMetrics.create({
        data: {
          metricName: `web_vital_${metric.name}`,
          metricValue: metric.value,
          timestamp: new Date(timestamp)
        }
      });
    }

    // Cache aggregated metrics
    const cacheKey = `web_vitals_${new Date().toDateString()}`;
    const existingMetrics = await cacheUtils.get(cacheKey) || [];
    existingMetrics.push(...metrics);
    await cacheUtils.set(cacheKey, existingMetrics, 86400); // 24 hours

    console.log('Web Vitals stored:', metrics.length, 'metrics');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Web Vitals API error:', error);
    return NextResponse.json(
      { error: 'Failed to store web vitals' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await prisma.systemMetrics.findMany({
      where: {
        metricName: {
          startsWith: 'web_vital_'
        },
        timestamp: {
          gte: startDate
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Aggregate metrics by type
    const aggregated = metrics.reduce((acc, metric) => {
      const vitalsType = metric.metricName.replace('web_vital_', '');
      if (!acc[vitalsType]) {
        acc[vitalsType] = {
          name: vitalsType,
          values: [],
          average: 0,
          p75: 0,
          p95: 0
        };
      }
      acc[vitalsType].values.push(metric.metricValue);
      return acc;
    }, {} as any);

    // Calculate statistics
    Object.keys(aggregated).forEach(key => {
      const values = aggregated[key].values.sort((a: number, b: number) => a - b);
      const sum = values.reduce((a: number, b: number) => a + b, 0);
      
      aggregated[key].average = sum / values.length;
      aggregated[key].p75 = values[Math.floor(values.length * 0.75)] || 0;
      aggregated[key].p95 = values[Math.floor(values.length * 0.95)] || 0;
      
      // Remove raw values for response size
      delete aggregated[key].values;
    });

    return NextResponse.json({
      success: true,
      data: aggregated,
      totalMetrics: metrics.length
    });
  } catch (error) {
    console.error('Web Vitals GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve web vitals' },
      { status: 500 }
    );
  }
}