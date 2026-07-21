import QRCode from "qrcode";
import PDFDocument from "pdfkit";

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

/**
 * Renders a premium membership card as a single-page PDF (credit-card
 * proportioned, landscape) and returns it as a Buffer.
 *
 * @param {object} member - Mongoose Member document (lean or hydrated)
 * @param {object} settings - Settings document (for logo/org name)
 */
export const generateMembershipCardPdf = async (member, settings = {}) => {
  const [photoBuffer, qrBuffer, logoBuffer] = await Promise.all([
    fetchImageBuffer(member.photo?.url || member.cloudinaryImage?.url),
    generateMemberQrBuffer(member.membershipId),
    fetchImageBuffer(settings?.logo?.url),
  ]);

  return new Promise((resolve, reject) => {
    // Card size: 340 x 214 pt (~ credit-card ratio, scaled up for print clarity)
    const doc = new PDFDocument({ size: [520, 320], margin: 0 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PRIMARY = "#0B5D1E";
    const SECONDARY = "#14532D";
    const ACCENT = "#84CC16";
    const DARK = "#071A0C";

    // Background
    doc.rect(0, 0, 520, 320).fill("#F8FAFC");

    // Header band
    doc.rect(0, 0, 520, 70).fill(PRIMARY);
    doc.rect(0, 66, 520, 4).fill(ACCENT);

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 16, 12, { fit: [46, 46] });
      } catch {
        /* ignore malformed logo */
      }
    }

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(15)
      .text(settings?.siteName || "Global KMCC Anganganadi Panchayath", 70, 14, { width: 360 });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#E2F5E5")
      .text("Official Membership Identity Card", 70, 36, { width: 360 });

    // Photo box
    const photoX = 24;
    const photoY = 90;
    doc.roundedRect(photoX, photoY, 100, 120, 6).fillAndStroke("#FFFFFF", "#E2E8F0");
    if (photoBuffer) {
      try {
        doc.image(photoBuffer, photoX + 4, photoY + 4, { fit: [92, 112], align: "center" });
      } catch {
        /* ignore malformed photo */
      }
    }

    // Name & Membership ID
    doc
      .fillColor(DARK)
      .font("Helvetica-Bold")
      .fontSize(17)
      .text(member.fullName || "—", 140, 92, { width: 260 });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(SECONDARY)
      .text(`Membership ID: ${member.membershipId}`, 140, 116);

    const statusColor =
      member.membershipStatus === "active"
        ? "#16A34A"
        : member.membershipStatus === "expired"
        ? "#DC2626"
        : "#CA8A04";

    doc
      .roundedRect(140, 134, 90, 18, 9)
      .fillAndStroke(statusColor, statusColor);
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text((member.membershipStatus || "pending").toUpperCase(), 140, 139, { width: 90, align: "center" });

    // Details grid
    const details = [
      ["Blood Group", member.bloodGroup || "—"],
      ["Working Country", member.workingCountry || "—"],
      ["Membership Type", member.membershipType?.title || "—"],
      ["Expiry Date", formatDate(member.membershipExpiry)],
      ["Phone", member.phone || "—"],
      ["Emergency Contact", member.whatsapp || member.phone || "—"],
    ];

    let dy = 162;
    details.forEach(([label, value], idx) => {
      const col = idx % 2;
      const x = 140 + col * 190;
      const y = dy + Math.floor(idx / 2) * 32;
      doc.font("Helvetica").fontSize(8).fillColor("#64748B").text(label.toUpperCase(), x, y);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(DARK).text(value, x, y + 11, { width: 175 });
    });

    // Address footer strip
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#475569")
      .text(
        [member.houseName, member.place, member.postOffice, member.district, member.state]
          .filter(Boolean)
          .join(", ") || member.address || "",
        24,
        222,
        { width: 300 }
      );

    // QR code
    doc.roundedRect(430, 90, 72, 72, 6).fillAndStroke("#FFFFFF", "#E2E8F0");
    doc.image(qrBuffer, 434, 94, { fit: [64, 64] });
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#64748B")
      .text("Scan to verify", 430, 164, { width: 72, align: "center" });

    // Bottom band
    doc.rect(0, 296, 520, 24).fill(SECONDARY);
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica")
      .fontSize(8)
      .text("This card is the property of Global KMCC Anganganadi Panchayath.", 16, 303, { width: 488 });

    doc.end();
  });
};
