import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export interface CertificateData {
  id?: string;
  certificateId: string;
  studentName: string;
  studentEmail?: string;
  gender?: 'Male' | 'Female' | string;
  courseName: string;
  domain?: string;
  startDate?: string;
  endDate?: string;
  issueDate?: string;
  grade?: string;
  marksPercentage?: string | number;
}

interface CourseCertificateProps {
  data: CertificateData;
  className?: string;
  containerId?: string;
}

export default function CourseCertificate({ data, className = '', containerId = 'certificate-node' }: CourseCertificateProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const studentName = data.studentName || 'Student Name';
  const domain = data.domain || data.courseName || 'Full Stack Web Development';
  const isFemale = data.gender?.toLowerCase() === 'female';

  const pronounHeShe = isFemale ? 'She' : 'He';
  const pronounHisHer = isFemale ? 'her' : 'his';
  const pronounHimHer = isFemale ? 'her' : 'him';

  let marks = data.marksPercentage;
  if (!marks) {
    const g = (data.grade || '').toUpperCase();
    if (g.includes('A+')) marks = '95';
    else if (g.includes('A')) marks = '92';
    else if (g.includes('B+')) marks = '88';
    else if (g.includes('B')) marks = '84';
    else if (g.includes('C')) marks = '78';
    else marks = '92';
  }
  const marksStr = typeof marks === 'string' && marks.includes('%') ? marks.replace('%', '') : marks;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Course Completion Date and Issue Date are strictly identical
  const completionDateRaw = data.endDate || data.issueDate || new Date().toISOString().split('T')[0];
  const formattedCompletionDate = formatDate(completionDateRaw);
  const formattedIssueDate = formattedCompletionDate; // Guaranteed identical

  let startFormatted = formatDate(data.startDate);
  let endFormatted = formattedCompletionDate;

  if (!startFormatted) {
    const end = new Date(completionDateRaw);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 3);
    startFormatted = formatDate(start.toISOString().split('T')[0]);
  }

  // Generate high-resolution QR Code data URL
  useEffect(() => {
    const verifyUrl = `${window.location.origin}/verify?id=${data.certificateId || 'FC-DEMO'}`;
    QRCode.toDataURL(verifyUrl, {
      width: 300,
      margin: 1,
      color: {
        dark: '#111111',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('QR code generation failed:', err));
  }, [data.certificateId]);

  const serifFont = '"Times New Roman", Times, Georgia, "Liberation Serif", serif';

  return (
    <div
      id={containerId}
      className={`relative overflow-hidden select-none bg-white ${className}`}
      style={{
        width: '794px',
        height: '1123px',
        fontFamily: serifFont,
        boxSizing: 'border-box',
      }}
    >
      {/* Background certificate template containing border, logos, and 'Issue Date:' */}
      <img
        src="/certificate-template.jpg"
        alt="Certificate Template"
        crossOrigin="anonymous"
        draggable={false}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '794px',
          height: '1123px',
          objectFit: 'fill',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Structured Content Layer */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '794px',
          height: '1123px',
          boxSizing: 'border-box',
        }}
      >
        {/* Recipient Name - Prominent Luxury Antique Gold Serif */}
        <div
          style={{
            position: 'absolute',
            top: '326px',
            left: '100px',
            right: '100px',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: serifFont,
              fontSize: '32px',
              fontWeight: 'bold',
              fontStyle: 'italic',
              color: '#946A14',
              letterSpacing: '1px',
              display: 'inline-block',
            }}
          >
            {studentName}
          </span>
        </div>

        {/* Certificate Body Text - Clean generous side margins (115px) and balanced spacing */}
        <div
          style={{
            position: 'absolute',
            top: '392px',
            left: '115px',
            right: '115px',
            fontFamily: serifFont,
            fontSize: '15.5px',
            lineHeight: '1.74',
            color: '#1a1a1a',
            fontStyle: 'italic',
            textAlign: 'justify',
          }}
        >
          {/* Paragraph 1 */}
          <p style={{ margin: '0 0 18px 0' }}>
            Successfully completed the <span style={{ fontWeight: 'bold' }}>{domain}</span> course with FutureCode AI from <span style={{ fontWeight: 'bold' }}>{startFormatted}</span> to <span style={{ fontWeight: 'bold' }}>{endFormatted}</span>.
          </p>

          {/* Paragraph 2 */}
          <p style={{ margin: '0 0 12px 0' }}>
            {pronounHeShe} learned under the guidance of Mr. Ravi Ranjan Kumar, Founder &amp; CEO, and {pronounHisHer} responsibilities included:
          </p>

          {/* Bullet Points */}
          <ul
            style={{
              margin: '0 0 18px 0',
              paddingLeft: '28px',
              listStyleType: 'disc',
            }}
          >
            <li style={{ marginBottom: '8px' }}>
              Successfully completed hands-on projects and practical assignments in {domain}.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Actively participated in problem-solving sessions, code reviews, and technical assessments.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Demonstrated strong foundational knowledge and applied industry-standard practices in {domain}.
            </li>
          </ul>

          {/* Paragraph 3 */}
          <p style={{ margin: '0 0 18px 0' }}>
            During this period, {studentName} developed strong skills in {domain} and achieved {marksStr}%.
          </p>

          {/* Paragraph 4 */}
          <p style={{ margin: '0' }}>
            I hereby certify {pronounHisHer} excellent performance and wish {pronounHimHer} continued success in all future endeavours.
          </p>
        </div>

        {/* Filled Date - Positioned directly after 'Issue Date:' (Identical to Course Completion Date) */}
        <div
          style={{
            position: 'absolute',
            top: '984px',
            left: '324px',
            fontFamily: serifFont,
            fontSize: '13.5px',
            fontWeight: 'bold',
            fontStyle: 'italic',
            color: '#1a1a1a',
            whiteSpace: 'nowrap',
          }}
        >
          {formattedIssueDate}
        </div>

        {/* Verification QR Code */}
        <div
          style={{
            position: 'absolute',
            top: '824px',
            left: '520px',
            width: '110px',
            height: '110px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            padding: '5px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1.5px solid #dcd1be',
          }}
        >
          {qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="Scan to Verify Certificate"
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#eee' }} />
          )}
        </div>

        {/* Certificate ID */}
        <div
          style={{
            position: 'absolute',
            top: '944px',
            left: '450px',
            width: '250px',
            textAlign: 'center',
            fontFamily: serifFont,
            fontSize: '13px',
            color: '#1a1a1a',
          }}
        >
          <span style={{ fontStyle: 'italic', fontWeight: 'bold' }}>ID: </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '0.8px', fontSize: '13px', color: '#000000' }}>
            {data.certificateId}
          </span>
        </div>
      </div>
    </div>
  );
}
