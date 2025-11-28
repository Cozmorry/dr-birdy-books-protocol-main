/**
 * Utility functions for formatting prices and currency values
 */

/**
 * Format a price value with currency symbol
 * @param value - The price value to format
 * @param currency - The currency symbol (default: '$')
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted price string
 */
export const formatPrice = (value: number | string, currency: string = '$', decimals: number = 2): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return `${currency}0.00`;
  }
  
  return `${currency}${numValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

/**
 * Format a price range
 * @param min - Minimum price
 * @param max - Maximum price
 * @param currency - Currency symbol (default: '$')
 * @returns Formatted price range string
 */
export const formatPriceRange = (min: number | string, max: number | string, currency: string = '$'): string => {
  const minPrice = formatPrice(min, currency);
  const maxPrice = formatPrice(max, currency);
  return `${minPrice} - ${maxPrice}`;
};

/**
 * Calculate USD value from token amount and price per token
 * @param tokenAmount - Amount of tokens
 * @param pricePerToken - Price per token in USD
 * @returns USD value
 */
export const calculateUSDValue = (tokenAmount: number | string, pricePerToken: number): number => {
  const amount = typeof tokenAmount === 'string' ? parseFloat(tokenAmount) : tokenAmount;
  return amount * pricePerToken;
};

/**
 * Format token amount with USD equivalent
 * @param tokenAmount - Amount of tokens
 * @param pricePerToken - Price per token in USD
 * @param tokenSymbol - Token symbol (default: 'DBBPT')
 * @returns Formatted string with token amount and USD equivalent
 */
export const formatTokenWithPrice = (
  tokenAmount: number | string, 
  pricePerToken: number, 
  tokenSymbol: string = 'DBBPT'
): string => {
  const amount = typeof tokenAmount === 'string' ? parseFloat(tokenAmount) : tokenAmount;
  const usdValue = calculateUSDValue(amount, pricePerToken);
  
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${tokenSymbol} (${formatPrice(usdValue)})`;
};