import { NextRequest, NextResponse } from 'next/server';
import { Candidate } from '@/types/index';
import { generateExcelFile, getExcelFileName } from '@/lib/export/excel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidates, roleName } = body;

    if (!Array.isArray(candidates)) {
      return NextResponse.json({ error: 'Invalid candidates array' }, { status: 400 });
    }

    if (!roleName || typeof roleName !== 'string') {
      return NextResponse.json({ error: 'Invalid roleName' }, { status: 400 });
    }

    const excelBuffer = await generateExcelFile(candidates, roleName);
    const fileName = getExcelFileName(roleName);

    return new NextResponse(Buffer.from(excelBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 });
  }
}
