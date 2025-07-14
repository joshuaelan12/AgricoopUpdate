'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Project, UserData } from './schemas';

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

export const generateProjectPdf = (project: Project, users: { [uid: string]: UserData }) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    let yPos = 22; // Start position for content

    // --- HELPER ---
    const currencyFormatter = new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 });

    // --- HEADER ---
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(project.title, 14, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report generated on: ${format(new Date(), 'PPP')}`, 14, yPos);
    yPos += 10;
    
    // --- DETAILS SECTION ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Details', 14, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Status: ${project.status}`, 14, yPos);
    doc.text(`Priority: ${project.priority || 'N/A'}`, 70, yPos);
    doc.text(`Progress: ${project.progress}%`, 140, yPos);
    yPos += 6;
    doc.text(`Deadline: ${project.deadline ? format(project.deadline, 'PP') : 'N/A'}`, 14, yPos);
    doc.text(`Budget: ${project.estimatedBudget ? currencyFormatter.format(project.estimatedBudget) : 'N/A'}`, 70, yPos);
    yPos += 8;

    doc.autoTable({
        body: [
            ['Description', project.description],
            ['Expected Outcome', project.expectedOutcome || 'Not specified'],
        ],
        startY: yPos,
        theme: 'plain',
        styles: { cellPadding: { top: 2, right: 2, bottom: 2, left: 0 } },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });
    yPos = doc.autoTable.previous.finalY + 10;

    // --- TASKS SECTION ---
    if (project.tasks && project.tasks.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Tasks', 14, yPos);
        yPos += 2;
        doc.autoTable({
            head: [['Title', 'Assigned To', 'Status', 'Deadline']],
            body: project.tasks.map(task => [
                task.title,
                task.assignedTo.map(uid => users[uid]?.displayName || 'Unknown').join(', '),
                task.status,
                task.deadline ? format(task.deadline, 'PP') : 'N/A',
            ]),
            startY: yPos,
            theme: 'striped',
            headStyles: { fillColor: [88, 32, 37], textColor: 255, fontStyle: 'bold' },
        });
        yPos = doc.autoTable.previous.finalY + 10;
    }

    // --- ALLOCATED RESOURCES SECTION ---
    if (project.allocatedResources && project.allocatedResources.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Allocated Resources', 14, yPos);
        yPos += 2;
        doc.autoTable({
            head: [['Resource Name', 'Quantity', 'Unit']],
            body: project.allocatedResources.map(res => [
                res.name,
                res.quantity,
                res.unit,
            ]),
            startY: yPos,
            theme: 'striped',
            headStyles: { fillColor: [88, 32, 37], textColor: 255, fontStyle: 'bold' },
        });
        yPos = doc.autoTable.previous.finalY + 10;
    }
    
    // --- OUTPUTS SECTION ---
    const outputs = project.outputs as { description: string, quantity: number, unit: string, date: any }[] || [];
    if (outputs.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Logged Outputs', 14, yPos);
        yPos += 2;
        doc.autoTable({
            head: [['Description', 'Quantity', 'Unit', 'Date']],
            body: outputs.map(out => [
                out.description,
                out.quantity,
                out.unit,
                out.date ? format(new Date(out.date), 'PP') : 'N/A',
            ]),
            startY: yPos,
            theme: 'striped',
            headStyles: { fillColor: [88, 32, 37], textColor: 255, fontStyle: 'bold' },
        });
        yPos = doc.autoTable.previous.finalY + 10;
    }


    // --- SAVE DOCUMENT ---
    const filename = `${project.title.toLowerCase().replace(/\s+/g, '_')}_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
};
