import ExcelJS from "exceljs";

const COLUMNS = [
  { header: "Membership ID", key: "membershipId", width: 20 },
  { header: "Full Name", key: "fullName", width: 25 },
  { header: "Phone", key: "phone", width: 18 },
  { header: "Email", key: "email", width: 25 },
  { header: "Gender", key: "gender", width: 10 },
  { header: "Blood Group", key: "bloodGroup", width: 12 },
  { header: "Working Country", key: "workingCountry", width: 18 },
  { header: "Native Place", key: "nativePlace", width: 20 },
  { header: "District", key: "district", width: 15 },
  { header: "State", key: "state", width: 15 },
  { header: "Country", key: "country", width: 15 },
  { header: "Status", key: "membershipStatus", width: 12 },
  { header: "Start Date", key: "membershipStart", width: 14 },
  { header: "Expiry Date", key: "membershipExpiry", width: 14 },
  { header: "Days Remaining", key: "daysRemaining", width: 15 },
  { header: "Committee Role", key: "committeeRole", width: 18 },
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
      phone: m.phone,
      email: m.email || "",
      gender: m.gender,
      bloodGroup: m.bloodGroup,
      workingCountry: m.workingCountry || "",
      nativePlace: m.nativePlace || "",
      district: m.district || "",
      state: m.state || "",
      country: m.country || "",
      membershipStatus: m.membershipStatus,
      membershipStart: m.membershipStart ? new Date(m.membershipStart).toLocaleDateString("en-IN") : "",
      membershipExpiry: m.membershipExpiry ? new Date(m.membershipExpiry).toLocaleDateString("en-IN") : "",
      daysRemaining: m.daysRemaining,
      committeeRole: m.committeeRole || "",
      joinedDate: m.joinedDate ? new Date(m.joinedDate).toLocaleDateString("en-IN") : "",
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
