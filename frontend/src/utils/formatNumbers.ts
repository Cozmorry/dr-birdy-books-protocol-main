/**
 * Utility functions for formatting numbers with commas and decimal places
 */

/**
 * Format a number with commas and 2 decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export const formatNumber = (value: number | string, decimals: number = 2): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0.00';
  }
  
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format a number with commas and no decimal places
 * @param value - The number to format
 * @returns Formatted number string
 */
export const formatInteger = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }
  
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

/**
 * Format a percentage with 2 decimal places
 * @param value - The number to format as percentage
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0.00%';
  }
  
  return `${formatNumber(numValue)}%`;
};

/**
 * Format a large number with appropriate suffixes (K, M, B, T)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string with suffix
 */
export const formatLargeNumber = (value: number | string, decimals: number = 2): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0.00';
  }
  
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  let magnitude = 0;
  let scaledValue = numValue;
  
  while (scaledValue >= 1000 && magnitude < suffixes.length - 1) {
    scaledValue /= 1000;
    magnitude++;
  }
  
  return `${formatNumber(scaledValue, decimals)}${suffixes[magnitude]}`;
};

/**
 * Format a token amount with appropriate precision
 * @param value - The token amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted token amount string
 */
export const formatTokenAmount = (value: number | string, decimals: number = 2): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0.00';
  }
  
  // For very small amounts, show more decimal places
  if (numValue < 0.01 && numValue > 0) {
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    });
  }
  
  return formatNumber(numValue, decimals);
};
