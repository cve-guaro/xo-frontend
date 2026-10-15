// lib/receiptGenerator.ts
// ────────────────────────────────────────────────────────────────────────────
// Professional Banking-grade Receipt Generator (Moniepoint style matching Image 2)
// Generates high-resolution PNG receipt cards with scalloped ticket edges.
// ────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';

export interface ReceiptData {
  id: string;
  ref?: string;
  type: string; // 'deposit' | 'withdrawal' | 'win' | 'prize' | 'stake'
  amount: number;
  status: string;
  method?: string;
  createdAt: string | Date;
  userName?: string;
  userPhone?: string;
}

export function formatReceiptDate(rawDate: string | Date): string {
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return "Today | " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayName = days[d.getDay()];
    const monthName = months[d.getMonth()];
    const dateNum = d.getDate();

    // Suffix (1st, 2nd, 3rd, 4th...)
    const s = ['th', 'st', 'nd', 'rd'];
    const v = dateNum % 100;
    const suffix = s[(v - 20) % 10] || s[v] || s[0];

    // Format time: 5:19 PM
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${dayName}, ${monthName} ${dateNum}${suffix}, ${d.getFullYear()} | ${hours}:${minutes} ${ampm}`;
  } catch {
    return new Date().toLocaleString();
  }
}

/**
 * Generates an Image 2-style banking receipt and triggers download.
 */
export async function downloadProfessionalReceipt(data: ReceiptData): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const width = 840;
  const height = 1200;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isCredit = ['deposit', 'win', 'prize'].includes(data.type.toLowerCase());
  const typeLabel = isCredit ? 'CREDIT' : 'DEBIT';
  const badgeBg = isCredit ? '#E0F2FE' : '#FEE2E2';
  const badgeText = isCredit ? '#0284C7' : '#DC2626';
  const formattedAmt = `${Number(data.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
  const formattedDate = formatReceiptDate(data.createdAt);
  const txRef = data.ref || `XOET_${data.id.slice(0, 16).toUpperCase()}`;
  const senderOrBeneficiary = data.userName || data.userPhone || 'Guest Player';

  // 1. Draw Vibrant Background (Royal Blue with diagonal yellow ribbon stripe — Image 2)
  ctx.fillStyle = '#0066FF';
  ctx.fillRect(0, 0, width, height);

  // Diagonal Golden Yellow Ribbon Stripe
  ctx.save();
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.moveTo(140, 0);
  ctx.lineTo(240, 0);
  ctx.lineTo(0, 240);
  ctx.lineTo(0, 140);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(320, 0);
  ctx.lineTo(440, 0);
  ctx.lineTo(0, 440);
  ctx.lineTo(0, 320);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width, height - 440);
  ctx.lineTo(width, height - 320);
  ctx.lineTo(width - 440, height);
  ctx.lineTo(width - 320, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. White Brand Header (Moniepoint style)
  // White Pill with Logo & Text
  const headerCardX = 220;
  const headerCardY = 40;
  const headerCardW = 400;
  const headerCardH = 76;
  const headerR = 38;

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(headerCardX, headerCardY, headerCardW, headerCardH, headerR);
  ctx.fill();

  // Logo Icon inside header pill
  ctx.fillStyle = '#0066FF';
  ctx.beginPath();
  ctx.roundRect(headerCardX + 16, headerCardY + 12, 52, 52, 14);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('XO', headerCardX + 42, headerCardY + 38);

  // Logo Text
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 28px sans-serif';
  ctx.fillText('XO ETHIOPIA', headerCardX + 80, headerCardY + 33);
  ctx.fillStyle = '#64748B';
  ctx.font = '800 11px sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('DIGITAL GAMING & ENTERTAINMENT', headerCardX + 80, headerCardY + 54);
  ctx.restore();

  // 3. Main White Receipt Card
  const cardX = 40;
  const cardY = 145;
  const cardW = width - 80; // 760
  const cardH = 970;
  const cardR = 36;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 15;
  ctx.fillStyle = '#FFFFFF';

  // Draw Card with Perforated Scalloped Bottom Edge
  ctx.beginPath();
  ctx.moveTo(cardX + cardR, cardY);
  ctx.lineTo(cardX + cardW - cardR, cardY);
  ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + cardR);
  ctx.lineTo(cardX + cardW, cardY + cardH);

  // Scalloped perforated ripples at the bottom
  const scallopCount = 19;
  const scallopStep = cardW / scallopCount;
  const scallopRadius = scallopStep / 2;

  for (let i = 0; i < scallopCount; i++) {
    const cx = cardX + cardW - (i * scallopStep) - scallopRadius;
    const cy = cardY + cardH;
    ctx.arc(cx, cy, scallopRadius, 0, Math.PI, false);
  }

  ctx.lineTo(cardX, cardY + cardR);
  ctx.quadraticCurveTo(cardX, cardY, cardX + cardR, cardY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4. Upper Left Pill Badge (CREDIT / DEBIT)
  ctx.save();
  const badgeX = cardX + 36;
  const badgeY = cardY + 40;
  ctx.fillStyle = badgeBg;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, 130, 36, 10);
  ctx.fill();

  ctx.fillStyle = badgeText;
  ctx.font = '900 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(typeLabel, badgeX + 65, badgeY + 18);

  // Upper Right Brand Monogram Icon (Rounded blue square with M/XO)
  const logoRightX = cardX + cardW - 36 - 64;
  const logoRightY = cardY + 36;
  ctx.fillStyle = '#0066FF';
  ctx.beginPath();
  ctx.roundRect(logoRightX, logoRightY, 64, 64, 18);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('XO', logoRightX + 32, logoRightY + 32);

  // 5. Large Bold Amount (Image 2 style)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 52px sans-serif';
  ctx.fillText(formattedAmt, badgeX, badgeY + 105);
  ctx.restore();

  // 6. Inner Form Card (Light gray container #F8FAFC matching Image 2)
  const innerX = cardX + 36;
  const innerY = cardY + 210;
  const innerW = cardW - 72;
  const innerH = 680;
  const innerR = 24;

  ctx.save();
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#EDF2F7';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(innerX, innerY, innerW, innerH, innerR);
  ctx.fill();
  ctx.stroke();

  // Helper row drawer
  const drawDetailBlock = (
    label: string,
    value: string,
    yPos: number,
    isPill: boolean = false,
    pillColor: string = '#3B82F6',
    pillBg: string = '#EFF6FF'
  ) => {
    // Label (gray)
    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, innerX + 32, yPos);

    if (isPill) {
      // Pill value
      const pillW = 120;
      const pillH = 34;
      ctx.fillStyle = pillBg;
      ctx.beginPath();
      ctx.roundRect(innerX + 32, yPos + 12, pillW, pillH, 8);
      ctx.fill();

      ctx.fillStyle = pillColor;
      ctx.font = '800 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(value, innerX + 32 + pillW / 2, yPos + 35);
    } else {
      // Value (bold dark)
      ctx.fillStyle = '#1E293B';
      ctx.font = '800 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(value, innerX + 32, yPos + 36);
    }

    // Divider line
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX + 32, yPos + 64);
    ctx.lineTo(innerX + innerW - 32, yPos + 64);
    ctx.stroke();
  };

  const transferLabel = data.type === 'deposit' ? 'Deposit' : (data.type === 'withdrawal' ? 'Withdrawal' : 'Transfer');
  drawDetailBlock('Transaction Type', transferLabel, innerY + 45, true, '#2563EB', '#DBEAFE');
  drawDetailBlock('Business Name', 'XO ETHIOPIA ENTERTAINMENT', innerY + 145);
  drawDetailBlock('Beneficiary / Account Name', senderOrBeneficiary.toUpperCase(), innerY + 245);
  drawDetailBlock('Payment Method', (data.method || 'TELEBIRR / CHAPA').toUpperCase(), innerY + 345);
  drawDetailBlock('Transaction Date', formattedDate, innerY + 445);

  // Transaction Reference
  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Transaction Reference', innerX + 32, innerY + 545);

  ctx.fillStyle = '#1E293B';
  ctx.font = '800 18px monospace';
  ctx.fillText(txRef, innerX + 32, innerY + 580);

  // Status Badge at bottom of form
  ctx.fillStyle = '#16A34A';
  ctx.font = '800 15px sans-serif';
  ctx.fillText(`● STATUS: ${data.status.toUpperCase()}`, innerX + 32, innerY + 630);
  ctx.restore();

  // 7. Trigger Direct Download of PNG Image
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const downloadLink = document.createElement('a');
  downloadLink.download = `XOET_Receipt_${data.id.slice(0, 12)}.png`;
  downloadLink.href = dataUrl;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
