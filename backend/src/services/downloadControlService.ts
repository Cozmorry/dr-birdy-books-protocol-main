import jwt from 'jsonwebtoken';
import DownloadLimit from '../models/DownloadLimit';

// Constants
const MAX_DAILY_DOWNLOADS = 20;
const MAX_MONTHLY_BYTES = 1024 * 1024 * 1024; // 1GB in bytes
const QUOTA_WARNING_THRESHOLD = 0.8; // 80% of quota
const PRE_SIGNED_URL_EXPIRY = 15 * 60; // 15 minutes in seconds
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

/**
 * Reset daily download count if it's a new day
 */
const resetDailyCountIfNeeded = async (limit: any): Promise<void> => {
  const now = new Date();
  const lastDownload = new Date(limit.lastDownloadDate);
  
  // Check if it's a new day (different date)
  if (
    now.getDate() !== lastDownload.getDate() ||
    now.getMonth() !== lastDownload.getMonth() ||
    now.getFullYear() !== lastDownload.getFullYear()
  ) {
    limit.dailyDownloads = 0;
    limit.lastDownloadDate = now;
    await limit.save();
  }
};

/**
 * Reset monthly quota if it's a new month
 */
const resetMonthlyQuotaIfNeeded = async (limit: any): Promise<void> => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  
  if (limit.lastResetMonth !== currentMonth || limit.lastResetYear !== currentYear) {
    limit.monthlyBytesDownloaded = 0;
    limit.quotaWarningSent = false;
    limit.lastResetMonth = currentMonth;
    limit.lastResetYear = currentYear;
    await limit.save();
  }
};

/**
 * Check if user has exceeded daily download limit
 */
export const checkDailyLimit = async (walletAddress: string): Promise<{ allowed: boolean; remaining: number }> => {
  if (!walletAddress) {
    return { allowed: false, remaining: 0 };
  }

  let limit = await DownloadLimit.findOne({ walletAddress: walletAddress.toLowerCase() });
  
  if (!limit) {
    // Create new limit record
    limit = await DownloadLimit.create({
      walletAddress: walletAddress.toLowerCase(),
      dailyDownloads: 0,
      monthlyBytesDownloaded: 0,
    });
  }

  // Reset daily count if needed
  await resetDailyCountIfNeeded(limit);
  
  const remaining = Math.max(0, MAX_DAILY_DOWNLOADS - limit.dailyDownloads);
  const allowed = limit.dailyDownloads < MAX_DAILY_DOWNLOADS;

  return { allowed, remaining };
};

/**
 * Check if user has exceeded monthly download quota
 */
export const checkMonthlyQuota = async (
  walletAddress: string,
  fileSize: number
): Promise<{ allowed: boolean; remaining: number; used: number; percentage: number; warningNeeded: boolean }> => {
  if (!walletAddress) {
    return { allowed: false, remaining: 0, used: 0, percentage: 0, warningNeeded: false };
  }

  let limit = await DownloadLimit.findOne({ walletAddress: walletAddress.toLowerCase() });
  
  if (!limit) {
    limit = await DownloadLimit.create({
      walletAddress: walletAddress.toLowerCase(),
      dailyDownloads: 0,
      monthlyBytesDownloaded: 0,
    });
  }

  // Reset monthly quota if needed
  await resetMonthlyQuotaIfNeeded(limit);

  const used = limit.monthlyBytesDownloaded;
  const remaining = Math.max(0, MAX_MONTHLY_BYTES - used);
  const allowed = (used + fileSize) <= MAX_MONTHLY_BYTES;
  const percentage = (used / MAX_MONTHLY_BYTES) * 100;
  
  // Check if warning is needed (80% threshold)
  const warningNeeded = percentage >= (QUOTA_WARNING_THRESHOLD * 100) && !limit.quotaWarningSent;

  return { allowed, remaining, used, percentage, warningNeeded };
};

/**
 * Record a download (increment counters)
 */
export const recordDownload = async (walletAddress: string, fileSize: number): Promise<void> => {
  if (!walletAddress) return;

  let limit = await DownloadLimit.findOne({ walletAddress: walletAddress.toLowerCase() });
  
  if (!limit) {
    limit = await DownloadLimit.create({
      walletAddress: walletAddress.toLowerCase(),
      dailyDownloads: 1,
      monthlyBytesDownloaded: fileSize,
      lastDownloadDate: new Date(),
    });
    return;
  }

  // Reset counters if needed
  await resetDailyCountIfNeeded(limit);
  await resetMonthlyQuotaIfNeeded(limit);

  // Increment counters
  limit.dailyDownloads += 1;
  limit.monthlyBytesDownloaded += fileSize;
  limit.lastDownloadDate = new Date();
  
  await limit.save();
};

/**
 * Mark quota warning as sent
 */
export const markQuotaWarningSent = async (walletAddress: string): Promise<void> => {
  if (!walletAddress) return;

  const limit = await DownloadLimit.findOne({ walletAddress: walletAddress.toLowerCase() });
  if (limit) {
    limit.quotaWarningSent = true;
    await limit.save();
  }
};

/**
 * Generate a pre-signed URL token for secure download
 */
export const generatePreSignedUrlToken = (fileId: string, walletAddress: string): string => {
  const payload = {
    fileId,
    walletAddress: walletAddress.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + PRE_SIGNED_URL_EXPIRY, // 15 minutes from now
  };

  return jwt.sign(payload, JWT_SECRET);
};

/**
 * Verify and decode a pre-signed URL token
 */
export const verifyPreSignedUrlToken = (token: string): { fileId: string; walletAddress: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      fileId: decoded.fileId,
      walletAddress: decoded.walletAddress,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Get user's download statistics
 */
export const getUserDownloadStats = async (walletAddress: string): Promise<{
  dailyDownloads: number;
  dailyRemaining: number;
  monthlyBytesUsed: number;
  monthlyBytesRemaining: number;
  monthlyPercentage: number;
}> => {
  if (!walletAddress) {
    return {
      dailyDownloads: 0,
      dailyRemaining: MAX_DAILY_DOWNLOADS,
      monthlyBytesUsed: 0,
      monthlyBytesRemaining: MAX_MONTHLY_BYTES,
      monthlyPercentage: 0,
    };
  }

  let limit = await DownloadLimit.findOne({ walletAddress: walletAddress.toLowerCase() });
  
  if (!limit) {
    return {
      dailyDownloads: 0,
      dailyRemaining: MAX_DAILY_DOWNLOADS,
      monthlyBytesUsed: 0,
      monthlyBytesRemaining: MAX_MONTHLY_BYTES,
      monthlyPercentage: 0,
    };
  }

  await resetDailyCountIfNeeded(limit);
  await resetMonthlyQuotaIfNeeded(limit);

  const dailyRemaining = Math.max(0, MAX_DAILY_DOWNLOADS - limit.dailyDownloads);
  const monthlyRemaining = Math.max(0, MAX_MONTHLY_BYTES - limit.monthlyBytesDownloaded);
  const monthlyPercentage = (limit.monthlyBytesDownloaded / MAX_MONTHLY_BYTES) * 100;

  return {
    dailyDownloads: limit.dailyDownloads,
    dailyRemaining,
    monthlyBytesUsed: limit.monthlyBytesDownloaded,
    monthlyBytesRemaining: monthlyRemaining,
    monthlyPercentage,
  };
};


