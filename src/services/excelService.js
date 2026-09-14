import ExcelJS from "exceljs";

// Zero-padded DD/MM/YYYY — toLocaleDateString("en-IN") renders unpadded
// (e.g. "1/1/2027"), which looks unprofessional in the exported sheet.
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
};

const COLUMNS = [
  { header: "Membership ID", key: "membershipId", width: 20 },
  { header: "Full Name", key: "fullName", width: 25 },
  { header: "Father's Name", key: "fatherName", width: 25 },
  { header: "DOB", key: "dob", width: 14 },
  { header: "Home Country Number", key: "homeCountryNumber", width: 20 },
  { header: "Working Country Number", key: "workingCountryNumber", width: 20 },
  { header: "Email", key: "email", width: 25 },
  { header: "Blood Group", key: "bloodGroup", width: 12 },
  { header: "Nominee Name", key: "nomineeName", width: 25 },
  { header: "Nominee Relation", key: "nomineeRelation", width: 18 },
  { header: "Zone", key: "zone", width: 20 },
  { header: "Working Country", key: "workingCountry", width: 18 },
  { header: "Status", key: "membershipStatus", width: 12 },
  { header: "Start Date", key: "membershipStart", width: 14 },
  { header: "Expiry Date", key: "membershipExpiry", width: 14 },
  { header: "Days Remaining", key: "daysRemaining", width: 15 },
  { header: "Joined Date", key: "joinedDate", width: 14 },
];

export const exportMembersToExcel = async (members) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Global KMCC Anganganadi Panchayath";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Members");
  sheet.columns = COLUMNS;

  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B5D1E" } };

  members.forEach((m) => {
    sheet.addRow({
      membershipId: m.membershipId,
      fullName: m.fullName,
      fatherName: m.fatherName || "",
      dob: formatDate(m.dob),
      homeCountryNumber: m.homeCountryNumber || "",
      workingCountryNumber: m.workingCountryNumber || "",
      email: m.email || "",
      bloodGroup: m.bloodGroup,
      nomineeName: m.nomineeName || "",
      nomineeRelation: m.nomineeRelation || "",
      zone: m.zone || "",
      workingCountry: m.workingCountry === "Other" ? m.workingCountryOther || "Other" : m.workingCountry || "",
      membershipStatus: m.membershipStatus,
      membershipStart: formatDate(m.membershipStart),
      membershipExpiry: formatDate(m.membershipExpiry),
      daysRemaining: m.daysRemaining,
      joinedDate: formatDate(m.joinedDate),
    });
  });

  return workbook.xlsx.writeBuffer();
};

/**
 * Parses an uploaded Excel buffer into plain row objects keyed by the
 * COLUMNS' header text. Used for bulk member import. Validation of each
 * row happens in the controller via the Zod admin-create schema.
 */
export const parseMembersExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];

  const headerRow = sheet.getRow(1).values.slice(1).map((h) => String(h).trim());
  const rows = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const values = row.values.slice(1);
    const record = {};
    headerRow.forEach((header, idx) => {
      record[header] = values[idx] ?? "";
    });
    rows.push(record);
  });

  return rows;
};
