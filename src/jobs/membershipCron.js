import cron from "node-cron";
import Member from "../models/Member.js";
import { sendMembershipReminderEmail } from "../services/emailService.js";

const REMINDER_DAYS = [30, 15, 7, 3, 1];
const GRACE_PERIOD_DAYS = 15;

/**
 * Recalculates daysRemaining/isExpired/membershipStatus for every member,
 * sends reminder emails at configured thresholds, and permanently
 * deactivates memberships that have exceeded the grace period.
 */
export const runMembershipMaintenance = async () => {
  const now = new Date();
  console.log(`[Cron] Running membership maintenance @ ${now.toISOString()}`);

  const members = await Member.find({
    membershipStatus: { $in: ["active", "expired"] },
  });

  let expiredCount = 0;
  let reminderCount = 0;
  let deactivatedCount = 0;

  for (const member of members) {
    const diffMs = new Date(member.membershipExpiry).getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    member.daysRemaining = Math.max(0, daysRemaining);

    if (diffMs <= 0) {
      member.isExpired = true;

      if (member.membershipStatus !== "expired") {
        member.membershipStatus = "expired";
        member.graceEndsAt = new Date(
          new Date(member.membershipExpiry).getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
        );
        expiredCount += 1;
      }

      // Permanently deactivate if grace period has passed
      if (member.graceEndsAt && now > member.graceEndsAt) {
        member.membershipStatus = "inactive";
        deactivatedCount += 1;
      }

      if (REMINDER_DAYS.includes(0) && member.email) {
        // expired-day reminder handled once via status transition above
      }
    } else if (REMINDER_DAYS.includes(daysRemaining) && member.email) {
      reminderCount += 1;
      sendMembershipReminderEmail(member.email, member, daysRemaining).catch((err) =>
        console.error(`[Cron] Failed reminder email for ${member.membershipId}:`, err.message)
      );
    }

    await member.save({ validateBeforeSave: false });
  }

  console.log(
    `[Cron] Done. Newly expired: ${expiredCount}, reminders sent: ${reminderCount}, deactivated: ${deactivatedCount}`
  );
};

/**
 * Registers the nightly cron job (runs every day at 00:00 server time).
 */
export const scheduleMembershipCron = () => {
  cron.schedule("0 0 * * *", () => {
    runMembershipMaintenance().catch((err) =>
      console.error("[Cron] Membership maintenance failed:", err.message)
    );
  });

  console.log("[Cron] Membership maintenance scheduled for 00:00 daily");
};
