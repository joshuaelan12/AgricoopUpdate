'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import { format } from 'date-fns';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}

const generatePdf = (title: string, head: string[][], body: (string | number)[][]) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;

  // Document Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 22);

  // Report Date
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report generated on: ${format(new Date(), 'PPP')}`, 14, 30);

  // Table
  doc.autoTable({
    startY: 35,
    head,
    body,
    theme: 'striped',
    headStyles: {
      fillColor: [88, 32, 37], // Corresponds to HSL of primary color
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: {
      cellPadding: 3,
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240], // A light gray, corresponds to a light shade of the background
    },
  });

  // Save the PDF
  const filename = `${title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
};

export default generatePdf;
