import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bundled fallback so the card still carries the org logo before an admin
// uploads a custom one via Settings.
const DEFAULT_LOGO_PATH = path.join(__dirname, "../assets/kmcc-logo.png");

/**
 * Generates a QR code (PNG buffer) that encodes a verification URL for the
 * member's card. The URL is intentionally simple so any QR scanner can open
 * it; the actual verification page/route is built in the frontend/API layer.
 */
export const generateMemberQrBuffer = async (membershipId) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify/${encodeURIComponent(membershipId)}`;
  return QRCode.toBuffer(verifyUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: { dark: "#0B5D1E", light: "#FFFFFF" },
  });
};

const fetchImageBuffer = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
};

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const workingCountryLabel = (member) =>
  member.workingCountry === "Other"
    ? member.workingCountryOther || "Other"
    : member.workingCountry || "—";

/**
 * Renders a premium membership card as a single-page PDF (credit-card
 * proportioned, landscape) and returns it as a Buffer. Only fields that are
 * part of the member registration form are ever rendered — no legacy or
 * internal data.
 *
 * @param {object} member - Mongoose Member document (lean or hydrated)
 * @param {object} settings - Settings document (for logo/org name)
 */
export const generateMembershipCardPdf = async (member, settings = {}) => {
  const [photoBuffer, qrBuffer, customLogoBuffer] = await Promise.all([
    fetchImageBuffer(member.photo?.url),
    generateMemberQrBuffer(member.membershipId),
    fetchImageBuffer(settings?.logo?.url),
  ]);
  const logoBuffer = customLogoBuffer || fs.readFileSync(DEFAULT_LOGO_PATH);

  return new Promise((resolve, reject) => {
    // Card size: 540 x 336 pt (~ credit-card ratio, scaled up for print clarity)
    const W = 540;
    const H = 336;
    const doc = new PDFDocument({ size: [W, H], margin: 0 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PRIMARY = "#0B5D1E";
    const SECONDARY = "#14532D";
    const ACCENT = "#D4AF37"; // KMCC gold/brass
    const DARK = "#0F1B12";
    const MUTED = "#5B6B60";

    // Background + subtle border
    doc.rect(0, 0, W, H).fill("#FBFAF6");
    doc.rect(2, 2, W - 4, H - 4).lineWidth(1.5).stroke(ACCENT);

    // Header band
    doc.rect(4, 4, W - 8, 62).fill(PRIMARY);
    doc.rect(4, 62, W - 8, 4).fill(ACCENT);

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 18, 15, { fit: [40, 40] });
      } catch {
        /* ignore malformed logo */
      }
    }

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(settings?.siteName || "Global KMCC Anganganadi Panchayath", 66, 14, {
        width: W - 90,
        ellipsis: true,
      });

    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor("#E2F5E5")
      .text("Official Membership Identity Card", 66, 34, { width: W - 90 });

    // Photo box
    const photoX = 22;
    const photoY = 82;
    doc.roundedRect(photoX, photoY, 110, 128, 6).fillAndStroke("#FFFFFF", "#E2E8F0");
    if (photoBuffer) {
      try {
        doc.image(photoBuffer, photoX + 4, photoY + 4, { fit: [102, 120], align: "center" });
      } catch {
        /* ignore malformed photo */
      }
    }

    const statusColor =
      member.membershipStatus === "active"
        ? "#16A34A"
        : member.membershipStatus === "expired"
        ? "#DC2626"
        : member.membershipStatus === "suspended"
        ? "#DC2626"
        : "#CA8A04";
    doc.roundedRect(photoX, photoY + 134, 110, 18, 9).fillAndStroke(statusColor, statusColor);
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .text((member.membershipStatus || "pending").toUpperCase(), photoX, photoY + 139, {
        width: 110,
        align: "center",
      });

    // Name & Membership ID
    const infoX = 148;
    doc
      .fillColor(DARK)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text(member.fullName || "—", infoX, 82, { width: W - infoX - 20, ellipsis: true });

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(SECONDARY)
      .text(`Membership ID: ${member.membershipId}`, infoX, 104);

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(SECONDARY)
      .text(`Valid Until: ${formatDate(member.membershipExpiry)}`, infoX, 118, {
        width: W - infoX - 100,
        ellipsis: true,
      });

    // Details grid — two columns, 4 rows
    const details = [
      ["Father's Name", member.fatherName || "—"],
      ["Date of Birth", formatDate(member.dob)],
      ["Blood Group", member.bloodGroup || "—"],
      ["Zone", member.zone || "—"],
      ["Home Country No.", member.homeCountryNumber || "—"],
      ["Working Country No.", member.workingCountryNumber || "—"],
      ["Working Country", workingCountryLabel(member)],
      ["Email", member.email || "—"],
    ];

    const colWidth = 168;
    let dy = 138;
    details.forEach(([label, value], idx) => {
      const col = idx % 2;
      const x = infoX + col * colWidth;
      const y = dy + Math.floor(idx / 2) * 30;
      doc.font("Helvetica").fontSize(7).fillColor(MUTED).text(label.toUpperCase(), x, y);
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(DARK)
        .text(String(value), x, y + 10, { width: colWidth - 10, ellipsis: true });
    });

    // Address strip (own row, full width, wraps instead of overflowing)
    const addressY = dy + 4 * 30 + 4;
    doc.font("Helvetica").fontSize(7).fillColor(MUTED).text("ADDRESS", infoX, addressY);
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(DARK)
      .text(member.address || "—", infoX, addressY + 10, { width: W - infoX - 20, height: 24, ellipsis: true });

    // QR code
    const qrX = W - 92;
    doc.roundedRect(qrX, 82, 72, 72, 6).fillAndStroke("#FFFFFF", "#E2E8F0");
    doc.image(qrBuffer, qrX + 4, 86, { fit: [64, 64] });
    doc
      .font("Helvetica")
      .fontSize(6.5)
      .fillColor(MUTED)
      .text("Scan to verify", qrX, 156, { width: 72, align: "center" });

    // Bottom band
    doc.rect(4, H - 26, W - 8, 22).fill(SECONDARY);
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica")
      .fontSize(7.5)
      .text(
        `This card is the property of ${settings?.siteName || "Global KMCC Anganganadi Panchayath"}. If found, please return it.`,
        16,
        H - 20,
        { width: W - 32 }
      );

    doc.end();
  });
};
