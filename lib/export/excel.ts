import { Candidate } from '@/types/index';
import * as ExcelJS from 'exceljs';

export async function generateExcelFile(
  candidates: Candidate[],
  roleName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Candidates');

  // Define columns
  worksheet.columns = [
    { header: 'Sr. No.', key: 'srNo', width: 8 },
    { header: 'Candidate Name', key: 'name', width: 25 },
    { header: 'Current Designation', key: 'designation', width: 35 },
    { header: 'Current Organization', key: 'organization', width: 25 },
    { header: 'LinkedIn Profile URL', key: 'url', width: 40 },
  ];

  // Add data rows
  candidates.forEach((candidate, index) => {
    worksheet.addRow({
      srNo: index + 1,
      name: candidate.name,
      designation: candidate.currentDesignation || '-',
      organization: candidate.currentOrganization || '-',
      url: candidate.linkedinUrl,
    });
  });

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FF0B1F3A' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F6FB' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'center' };

  // Make LinkedIn URLs clickable
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const urlCell = row.getCell('url');
      urlCell.hyperlink = {
        text: 'View Profile',
        tooltip: 'Click to open LinkedIn profile',
        target: urlCell.value as string,
      };
      urlCell.font = { color: { argb: 'FF00B4A6' }, underline: 'single' };
    }
  });

  // Add summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 25 },
  ];

  const totalCandidates = candidates.length;
  const excellentMatches = candidates.filter((c) => c.matchStrength === 'excellent').length;
  const strongMatches = candidates.filter((c) => c.matchStrength === 'strong').length;
  const potentialMatches = candidates.filter((c) => c.matchStrength === 'potential').length;

  summarySheet.addRows([
    { metric: 'Search Date', value: new Date().toLocaleDateString() },
    { metric: 'Role Searched', value: roleName },
    { metric: 'Total Candidates', value: totalCandidates },
    { metric: 'Excellent Matches', value: excellentMatches },
    { metric: 'Strong Matches', value: strongMatches },
    { metric: 'Potential Matches', value: potentialMatches },
  ]);

  // Style summary
  const summaryHeaderRow = summarySheet.getRow(1);
  summaryHeaderRow.font = { bold: true, color: { argb: 'FF0B1F3A' } };
  summaryHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F6FB' } };

  // Return buffer
  return await workbook.xlsx.writeBuffer() as any;
}

export function getExcelFileName(roleName: string): string {
  const date = new Date().toISOString().split('T')[0];
  const cleanRole = roleName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  return `AlphaSourcer_${cleanRole}_${date}.xlsx`;
}
