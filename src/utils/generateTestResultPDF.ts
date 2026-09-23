import jsPDF from 'jspdf';

/**
 * Generates a branded PDF result report for a student's test attempt.
 * Uses the same clean, professional style inspired by CourseCertificate.tsx branding.
 */
export function generateTestResultPDF(
  test: any,
  attempt: any,
  questions: any[]
): void {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // ─── Header / Branding ───────────────────────────────────
  // Top accent line
  pdf.setFillColor(79, 70, 229); // Primary indigo
  pdf.rect(0, 0, pageWidth, 4, 'F');

  y = 16;

  // Logo text
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(21, 42, 79); // #152a4f
  pdf.text('FutureCode', margin, y);
  const fcWidth = pdf.getTextWidth('FutureCode');
  pdf.setTextColor(36, 164, 181); // #24a4b5
  pdf.text('AI', margin + fcWidth, y);

  // Report label
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139); // slate-500
  pdf.setFont('helvetica', 'normal');
  pdf.text('TEST RESULT REPORT', pageWidth - margin, y, { align: 'right' });

  y += 8;
  pdf.setDrawColor(226, 232, 240); // slate-200
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ─── Student & Test Info ─────────────────────────────────
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105); // slate-600

  const infoLeftX = margin;
  const infoRightX = pageWidth / 2 + 10;

  pdf.text('Student Name:', infoLeftX, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 41, 59);
  pdf.text(attempt.studentName || 'N/A', infoLeftX + 30, y);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Email:', infoRightX, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 41, 59);
  pdf.text(attempt.studentEmail || 'N/A', infoRightX + 15, y);

  y += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Test Title:', infoLeftX, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 41, 59);
  pdf.text(test.title || 'N/A', infoLeftX + 22, y);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Date:', infoRightX, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 41, 59);
  const submittedDate = attempt.submittedAt?.toDate
    ? attempt.submittedAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  pdf.text(submittedDate, infoRightX + 13, y);

  y += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Type:', infoLeftX, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 41, 59);
  pdf.text((test.type || 'mcq').toUpperCase(), infoLeftX + 14, y);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Attempt:', infoRightX, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 41, 59);
  pdf.text(`#${attempt.attemptNumber || 1}`, infoRightX + 19, y);

  y += 10;

  // ─── Score Summary Box ───────────────────────────────────
  const boxHeight = 28;
  const isPassed = attempt.passed;

  // Background
  pdf.setFillColor(isPassed ? 236 : 254, isPassed ? 253 : 242, isPassed ? 245 : 242);
  pdf.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'F');

  // Border
  pdf.setDrawColor(isPassed ? 167 : 252, isPassed ? 243 : 165, isPassed ? 208 : 165);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'S');

  const boxCenterY = y + boxHeight / 2;

  // Score
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  const scoreText = `${attempt.totalScore ?? 0} / ${attempt.maxScore ?? 0}`;
  pdf.text(scoreText, margin + 12, boxCenterY - 2);

  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Total Score', margin + 12, boxCenterY + 5);

  // Percentage
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(isPassed ? 5 : 220, isPassed ? 150 : 38, isPassed ? 105 : 38);
  const pctText = `${(attempt.percentage ?? 0).toFixed(1)}%`;
  pdf.text(pctText, margin + contentWidth / 2, boxCenterY - 2, { align: 'center' });

  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Percentage', margin + contentWidth / 2, boxCenterY + 5, { align: 'center' });

  // Pass/Fail Badge
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(isPassed ? 5 : 220, isPassed ? 150 : 38, isPassed ? 105 : 38);
  pdf.text(isPassed ? 'PASSED' : 'FAILED', pageWidth - margin - 12, boxCenterY + 1, { align: 'right' });

  y += boxHeight + 10;

  // ─── Question Breakdown Table ────────────────────────────
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('Question-by-Question Breakdown', margin, y);
  y += 7;

  // Table Header
  const colWidths = [12, 16, contentWidth - 12 - 16 - 22 - 22 - 30, 22, 22, 30];
  const colX = [margin];
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1]);
  }

  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.rect(margin, y, contentWidth, 7, 'F');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);

  const headers = ['Q#', 'Type', 'Question', 'Marks', 'Scored', 'Status'];
  headers.forEach((h, i) => {
    pdf.text(h, colX[i] + 1, y + 5);
  });
  y += 8;

  // Table Rows
  questions.forEach((q, idx) => {
    const answer = attempt.answers?.[q.id];
    if (!answer) return;

    addNewPageIfNeeded(10);

    // Alternate row background
    if (idx % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y - 1, contentWidth, 8, 'F');
    }

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);

    // Q#
    pdf.text(`${idx + 1}`, colX[0] + 1, y + 4);

    // Type
    pdf.setTextColor(q.type === 'mcq' ? 79 : 13, q.type === 'mcq' ? 70 : 148, q.type === 'mcq' ? 229 : 136);
    pdf.setFont('helvetica', 'bold');
    pdf.text(q.type === 'mcq' ? 'MCQ' : 'Code', colX[1] + 1, y + 4);

    // Question text (truncated)
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);
    const qText = q.type === 'mcq' ? (q.questionText || '') : (q.problemStatement || '');
    const truncated = qText.length > 60 ? qText.slice(0, 57) + '...' : qText;
    pdf.text(truncated, colX[2] + 1, y + 4);

    // Marks
    pdf.text(`${q.marks}`, colX[3] + 1, y + 4);

    // Scored
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${answer.marksAwarded ?? 0}`, colX[4] + 1, y + 4);

    // Status
    let status = '';
    let statusColor: [number, number, number] = [100, 116, 139];
    if (answer.isCorrect) {
      status = 'Correct';
      statusColor = [5, 150, 105]; // emerald
    } else if (answer.reviewStatus === 'pending_review') {
      status = 'Pending';
      statusColor = [217, 119, 6]; // amber
    } else if (answer.reviewStatus === 'reviewed') {
      status = 'Reviewed';
      statusColor = [59, 130, 246]; // blue
    } else {
      status = 'Incorrect';
      statusColor = [220, 38, 38]; // red
    }
    pdf.setTextColor(...statusColor);
    pdf.text(status, colX[5] + 1, y + 4);

    y += 8;
  });

  // Bottom border
  y += 2;
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ─── Coding Question Details ─────────────────────────────
  const codingQuestions = questions.filter(q => q.type === 'coding');
  if (codingQuestions.length > 0) {
    addNewPageIfNeeded(20);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Coding Submissions', margin, y);
    y += 7;

    codingQuestions.forEach((q) => {
      const answer = attempt.answers?.[q.id];
      if (!answer) return;

      addNewPageIfNeeded(30);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(71, 85, 105);
      const qNum = questions.indexOf(q) + 1;
      pdf.text(`Q${qNum}: ${(q.problemStatement || '').slice(0, 80)}...`, margin, y);
      y += 5;

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Language: ${answer.language || 'N/A'} | Status: ${answer.reviewStatus || 'N/A'} | Marks: ${answer.marksAwarded ?? 0}/${q.marks}`, margin, y);
      y += 5;

      // Code snippet (truncated for PDF)
      const codeLines = (answer.code || '(No code submitted)').split('\n').slice(0, 15);
      pdf.setFillColor(30, 41, 59); // dark bg
      const codeHeight = Math.min(codeLines.length * 4 + 4, 64);
      pdf.roundedRect(margin, y, contentWidth, codeHeight, 2, 2, 'F');

      pdf.setFontSize(6);
      pdf.setFont('courier', 'normal');
      pdf.setTextColor(52, 211, 153); // emerald-400
      codeLines.forEach((line: string, lineIdx: number) => {
        if (y + 4 + lineIdx * 4 < y + codeHeight - 2) {
          const safeLine = line.length > 100 ? line.slice(0, 97) + '...' : line;
          pdf.text(safeLine, margin + 3, y + 4 + lineIdx * 4);
        }
      });

      y += codeHeight + 6;
    });
  }

  // ─── Footer ──────────────────────────────────────────────
  addNewPageIfNeeded(15);
  y = pageHeight - 15;

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y - 5, pageWidth - margin, y - 5);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184); // slate-400
  pdf.text('Generated by FutureCodeAI · www.futurecodeai.com', margin, y);
  pdf.text(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), pageWidth - margin, y, { align: 'right' });

  // Save
  const fileName = `${(attempt.studentName || 'Student').replace(/\s+/g, '_')}_${(test.title || 'Test').replace(/\s+/g, '_')}_Result.pdf`;
  pdf.save(fileName);
}
