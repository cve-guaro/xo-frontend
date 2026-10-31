// lib/receiptGenerator.ts
// ────────────────────────────────────────────────────────────────────────────
// Professional Banking & Ticket Receipt Generator (Matching Image 3 & Image 1)
// Generates high-resolution PNG receipt ticket with side notches & XO logo.
// Accurately synchronizes status (Success, Failed, Pending), date, amount & method.
// ────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';

export interface ReceiptData {
  id: string;
  ref?: string;
  type: string; // 'deposit' | 'withdrawal' | 'win' | 'prize' | 'stake'
  amount: number;
  status: string; // 'success' | 'pending' | 'failed' | 'PENDING' | 'COMPLETED' | 'SUCCESS' | 'FAILED'
  method?: string;
  createdAt: string | Date;
  userName?: string;
  userPhone?: string;
}

export function formatTicketDateTime(rawDate: string | Date): string {
  if (!rawDate) return new Date().toLocaleString();
  try {
    // If it's already a formatted string like "2/18/2026, 2:56:56 PM", return it directly
    if (typeof rawDate === 'string') {
      const trimmed = rawDate.trim();
      if (trimmed.includes('/') && (trimmed.includes('AM') || trimmed.includes('PM'))) {
        return trimmed;
      }
    }
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) {
      return typeof rawDate === 'string' ? rawDate : new Date().toLocaleString();
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hoursStr = String(hours).padStart(2, '0');

    return `${day}/${month}/${year} ${hoursStr}:${minutes}:${seconds} ${ampm}`;
  } catch {
    return String(rawDate || new Date().toLocaleString());
  }
}

/**
 * Generates an Image 3-style scalloped ticket receipt and downloads it as a PNG image.
 */
export async function downloadProfessionalReceipt(data: ReceiptData): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const canvasWidth = 750;
  const canvasHeight = 1050;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isDeposit = ['deposit', 'win', 'prize'].includes(data.type.toLowerCase());
  const statusUpper = String(data.status || 'success').toUpperCase();
  const isFailed = statusUpper.includes('FAIL');
  const isPending = statusUpper.includes('PEND');
  const isSuccess = !isFailed && !isPending;

  const sign = isDeposit ? '+' : '-';
  const formattedAmt = `${sign}${Number(data.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
  const dateTimeStr = formatTicketDateTime(data.createdAt);
  const billNumber = (data.ref || data.id || `XO${data.id.slice(0, 10)}`).toUpperCase();
  const rawMethod = data.method || 'Chapa';
  const paymentMethod = rawMethod.toUpperCase();
  const typeDisplay = isDeposit ? 'Top up / Deposit' : data.type === 'withdrawal' ? 'Withdrawal Payout' : 'Game Reward';

  // 1. Soft Background (Matching Image 3)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bgGrad.addColorStop(0, '#DDE5F4');
  bgGrad.addColorStop(1, '#C8D6EC');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. Ticket Dimensions
  const ticketX = 75;
  const ticketY = 60;
  const ticketW = canvasWidth - 150; // 600
  const ticketH = canvasHeight - 120; // 930
  const cornerR = 24;
  const notchY = ticketY + 450; // Perforation line position
  const notchR = 18;

  // Draw Ticket Shape with Side Semi-Circular Cutouts
  ctx.save();
  ctx.shadowColor = 'rgba(28, 41, 74, 0.16)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#FFFFFF';

  ctx.beginPath();
  // Top-left corner
  ctx.moveTo(ticketX + cornerR, ticketY);
  // Top edge
  ctx.lineTo(ticketX + ticketW - cornerR, ticketY);
  ctx.quadraticCurveTo(ticketX + ticketW, ticketY, ticketX + ticketW, ticketY + cornerR);
  // Right edge down to notch
  ctx.lineTo(ticketX + ticketW, notchY - notchR);
  // Right notch (inward semi-circle)
  ctx.arc(ticketX + ticketW, notchY, notchR, -Math.PI / 2, Math.PI / 2, true);
  // Right edge from notch to bottom
  ctx.lineTo(ticketX + ticketW, ticketY + ticketH - cornerR);
  ctx.quadraticCurveTo(ticketX + ticketW, ticketY + ticketH, ticketX + ticketW - cornerR, ticketY + ticketH);
  // Bottom edge
  ctx.lineTo(ticketX + cornerR, ticketY + ticketH);
  ctx.quadraticCurveTo(ticketX, ticketY + ticketH, ticketX, ticketY + ticketH - cornerR);
  // Left edge up to notch
  ctx.lineTo(ticketX, notchY + notchR);
  // Left notch (inward semi-circle)
  ctx.arc(ticketX, notchY, notchR, Math.PI / 2, -Math.PI / 2, true);
  // Left edge from notch to top
  ctx.lineTo(ticketX, ticketY + cornerR);
  ctx.quadraticCurveTo(ticketX, ticketY, ticketX + cornerR, ticketY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. Top Header with XO Logo ("with white in top xo logo")
  const logoCenterX = ticketX + ticketW / 2;
  const logoY = ticketY + 36;

  // Pill for XO Logo badge
  ctx.save();
  ctx.fillStyle = '#060A14';
  ctx.beginPath();
  ctx.roundRect(logoCenterX - 85, logoY, 170, 36, 18);
  ctx.fill();

  // Cyan dot
  ctx.fillStyle = '#00DAF3';
  ctx.beginPath();
  ctx.arc(logoCenterX - 56, logoY + 18, 5, 0, Math.PI * 2);
  ctx.fill();

  // XO ET text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('XO ETHIOPIA', logoCenterX - 44, logoY + 18);
  ctx.restore();

  // 4. Circular Status Badge (Success = Green Checkmark, Failed = Red Cross, Pending = Amber Clock)
  const badgeCenterY = ticketY + 140;
  ctx.save();

  let outerCircleBg = '#DCFCE7';
  let innerBadgeColor = '#22C55E';
  if (isFailed) {
    outerCircleBg = '#FEE2E2';
    innerBadgeColor = '#EF4444';
  } else if (isPending) {
    outerCircleBg = '#FEF3C7';
    innerBadgeColor = '#F59E0B';
  }

  // Soft pastel background circle
  ctx.fillStyle = outerCircleBg;
  ctx.beginPath();
  ctx.arc(logoCenterX, badgeCenterY, 44, 0, Math.PI * 2);
  ctx.fill();

  // Scalloped / star flower badge in center
  ctx.fillStyle = innerBadgeColor;
  ctx.beginPath();
  const numPoints = 12;
  const outerRadius = 30;
  const innerRadius = 24;
  for (let i = 0; i < numPoints * 2; i++) {
    const r = (i % 2 === 0) ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / numPoints;
    const x = logoCenterX + Math.cos(angle) * r;
    const y = badgeCenterY + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Draw status icon inside star badge
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isFailed) {
    // Red Cross '✕'
    ctx.beginPath();
    ctx.moveTo(logoCenterX - 10, badgeCenterY - 10);
    ctx.lineTo(logoCenterX + 10, badgeCenterY + 10);
    ctx.moveTo(logoCenterX + 10, badgeCenterY - 10);
    ctx.lineTo(logoCenterX - 10, badgeCenterY + 10);
    ctx.stroke();
  } else if (isPending) {
    // Amber Clock hands
    ctx.beginPath();
    ctx.arc(logoCenterX, badgeCenterY, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(logoCenterX, badgeCenterY - 7);
    ctx.lineTo(logoCenterX, badgeCenterY);
    ctx.lineTo(logoCenterX + 5, badgeCenterY);
    ctx.stroke();
  } else {
    // Green Checkmark '✓'
    ctx.beginPath();
    ctx.moveTo(logoCenterX - 11, badgeCenterY);
    ctx.lineTo(logoCenterX - 3, badgeCenterY + 8);
    ctx.lineTo(logoCenterX + 12, badgeCenterY - 8);
    ctx.stroke();
  }
  ctx.restore();

  // 5. Title & Subtitle (Accurately synchronizing status)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  let mainTitle = isDeposit ? 'Top up successfully' : 'Withdrawal processed';
  let subTitle = isDeposit ? 'Thank you! Your wallet is ready.' : 'Transaction successfully submitted.';

  if (isFailed) {
    mainTitle = isDeposit ? 'Deposit Failed' : 'Withdrawal Failed';
    subTitle = 'The transaction could not be processed.';
  } else if (isPending) {
    mainTitle = isDeposit ? 'Deposit Processing' : 'Withdrawal Pending';
    subTitle = 'Awaiting confirmation from provider.';
  }

  ctx.fillText(mainTitle, logoCenterX, badgeCenterY + 70);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 14.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(subTitle, logoCenterX, badgeCenterY + 98);
  ctx.restore();

  // 6. Top Half Key-Value Rows (Bill Number, Date and Time)
  const rowLeftX = ticketX + 44;
  const rowRightX = ticketX + ticketW - 44;
  const rowY1 = badgeCenterY + 146;
  const rowY2 = rowY1 + 34;

  ctx.save();
  ctx.font = '500 14px sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'left';
  ctx.fillText('Bill Number:', rowLeftX, rowY1);
  ctx.fillText('Date and Time:', rowLeftX, rowY2);

  ctx.font = '700 14px monospace';
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'right';
  ctx.fillText(billNumber, rowRightX, rowY1);

  ctx.font = '600 13.5px sans-serif';
  ctx.fillText(dateTimeStr, rowRightX, rowY2);
  ctx.restore();

  // 7. Perforated Dashed Divider Line across notches
  ctx.save();
  ctx.setLineDash([7, 6]);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(ticketX + notchR + 10, notchY);
  ctx.lineTo(ticketX + ticketW - notchR - 10, notchY);
  ctx.stroke();
  ctx.restore();

  // 8. Lower Half Breakdown Rows (Package, Type, Status, Payment Amount)
  const lowRowY1 = notchY + 38;
  const lowRowY2 = lowRowY1 + 32;
  const lowRowY3 = lowRowY2 + 32;
  const lowRowY4 = lowRowY3 + 34;

  ctx.save();
  ctx.font = '500 14px sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'left';
  ctx.fillText('Package:', rowLeftX, lowRowY1);
  ctx.fillText('Type:', rowLeftX, lowRowY2);
  ctx.fillText('Status:', rowLeftX, lowRowY3);
  ctx.fillText('Payment Amount:', rowLeftX, lowRowY4);

  ctx.textAlign = 'right';
  ctx.font = '700 14px sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('XOET Gaming Credit', rowRightX, lowRowY1);

  ctx.fillStyle = '#0F172A';
  ctx.fillText(typeDisplay, rowRightX, lowRowY2);

  // Status Badge
  const statusColor = isFailed ? '#EF4444' : isPending ? '#D97706' : '#16A34A';
  const statusLabel = isFailed ? 'FAILED' : isPending ? 'PROCESSING' : 'COMPLETED';
  ctx.fillStyle = statusColor;
  ctx.font = '800 13.5px sans-serif';
  ctx.fillText(statusLabel, rowRightX, lowRowY3);

  // Big Bold Amount
  ctx.font = '900 19px sans-serif';
  ctx.fillStyle = isFailed ? '#EF4444' : isSuccess ? '#16A34A' : '#0F172A';
  ctx.fillText(formattedAmt, rowRightX, lowRowY4);
  ctx.restore();

  // 9. Payment Method Card (Gray container at the bottom matching Image 3)
  const methodCardX = ticketX + 36;
  const methodCardY = lowRowY4 + 28;
  const methodCardW = ticketW - 72;
  const methodCardH = 92;
  const methodCardR = 16;

  ctx.save();
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(methodCardX, methodCardY, methodCardW, methodCardH, methodCardR);
  ctx.fill();

  // "Payment method:" header label
  ctx.font = '600 12.5px sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'left';
  ctx.fillText('Payment method:', methodCardX + 20, methodCardY + 26);

  // Payment Badge pill
  const badgePillW = 62;
  const badgePillH = 28;
  const badgePillX = methodCardX + 20;
  const badgePillY = methodCardY + 42;

  const isChapa = paymentMethod.includes('CHAPA');
  const isTelebirr = paymentMethod.includes('TELEBIRR');
  const badgeBg = isTelebirr ? '#0284C7' : isChapa ? '#059669' : '#1E3A8A';

  ctx.fillStyle = badgeBg;
  ctx.beginPath();
  ctx.roundRect(badgePillX, badgePillY, badgePillW, badgePillH, 6);
  ctx.fill();

  ctx.font = '900 12px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isTelebirr ? 'TELE' : isChapa ? 'CHAPA' : 'PAY', badgePillX + badgePillW / 2, badgePillY + badgePillH / 2);

  // Method details text
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 14px sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(paymentMethod, badgePillX + badgePillW + 14, badgePillY + 14);

  ctx.font = '500 11.5px sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('Instant Secure Verification', badgePillX + badgePillW + 14, badgePillY + 30);
  ctx.restore();

  // 10. Watermark & Security ID at bottom footer
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '600 11px monospace';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(`AUTHENTICATED BY XO ETHIOPIA • ID: ${data.id.slice(0, 16).toUpperCase()}`, logoCenterX, ticketY + ticketH - 22);
  ctx.restore();

  // 11. Trigger Direct Download of PNG Image
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const downloadLink = document.createElement('a');
  downloadLink.download = `XOET_Receipt_${data.id.slice(0, 12)}.png`;
  downloadLink.href = dataUrl;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
