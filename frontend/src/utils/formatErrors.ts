/**
 * Utility functions to format error messages for users
 * Converts technical error messages into user-friendly ones
 */

export interface UserFriendlyError {
  title: string;
  message: string;
}

/**
 * Formats error messages to be user-friendly
 * @param error - The error object or message string
 * @param context - Additional context about the operation
 * @returns User-friendly error object with title and message
 */
export function formatUserError(
  error: any,
  context?: {
    operation?: string;
    amount?: string;
    balance?: string;
    stakedAmount?: string;
  }
): UserFriendlyError {
  const errorMessage = error?.message || error?.reason || String(error) || 'An unknown error occurred';
  const errorLower = errorMessage.toLowerCase();

  // Unstaking errors
  if (errorLower.includes('insufficient') && errorLower.includes('balance')) {
    if (context?.stakedAmount) {
      return {
        title: 'Insufficient Staked Amount',
        message: `You don't have enough staked tokens. You currently have ${context.stakedAmount} DBBPT staked.`
      };
    }
    return {
      title: 'Insufficient Balance',
      message: `You don't have enough tokens to complete this action. ${context?.balance ? `Your balance: ${context.balance} DBBPT` : ''}`
    };
  }

  // Staking errors
  if (errorLower.includes('insufficient') && errorLower.includes('allowance')) {
    return {
      title: 'Approval Required',
      message: 'You need to approve tokens before staking. Please click "Approve Tokens" first.'
    };
  }

  // Gas fee errors
  if (errorLower.includes('insufficient funds') || errorLower.includes('gas')) {
    return {
      title: 'Insufficient Gas Fees',
      message: "You don't have enough ETH in your wallet to pay for transaction fees. Please add more ETH and try again."
    };
  }

  // User rejection
  if (errorLower.includes('user rejected') || errorLower.includes('user denied') || errorLower.includes('rejected')) {
    return {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction. No changes were made.'
    };
  }

  // Contract paused
  if (errorLower.includes('paused') || errorLower.includes('contract is paused')) {
    return {
      title: 'Service Temporarily Unavailable',
      message: 'This feature is currently paused. Please try again later.'
    };
  }

  // Minimum staking duration
  if (errorLower.includes('minimum staking duration') || errorLower.includes('cannot unstake')) {
    return {
      title: 'Unstaking Not Available Yet',
      message: 'You need to wait at least 24 hours after staking before you can unstake your tokens.'
    };
  }

  // Zero amount errors
  if (errorLower.includes('zero') || errorLower.includes('cannot stake zero')) {
    return {
      title: 'Invalid Amount',
      message: 'Please enter an amount greater than zero.'
    };
  }

  // Transaction reverted (generic)
  if (errorLower.includes('execution reverted') || errorLower.includes('revert')) {
    if (errorLower.includes('insufficient')) {
      return {
        title: 'Transaction Failed',
        message: "You don't have enough tokens or allowance to complete this transaction. Please check your balance and try again."
      };
    }
    return {
      title: 'Transaction Failed',
      message: 'The transaction could not be completed. Please check your balance and try again, or contact support if the issue persists.'
    };
  }

  // Network errors
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the blockchain. Please check your internet connection and try again.'
    };
  }

  // Contract not available
  if (errorLower.includes('contract') && (errorLower.includes('not available') || errorLower.includes('not set'))) {
    return {
      title: 'Service Not Ready',
      message: 'The service is not fully configured yet. Please contact support if this issue persists.'
    };
  }

  // Oracle errors
  if (errorLower.includes('oracle') || errorLower.includes('price feed')) {
    return {
      title: 'Price Data Unavailable',
      message: 'Unable to fetch current token prices. Please try again in a few moments.'
    };
  }

  // Generic error - try to extract useful info
  let message = errorMessage;
  
  // Remove technical details
  message = message.replace(/execution reverted:/gi, '');
  message = message.replace(/VM Exception while processing transaction:/gi, '');
  message = message.replace(/revert /gi, '');
  message = message.replace(/Error: /gi, '');
  message = message.replace(/❌/g, '');
  
  // Clean up diagnostic info that's too technical
  if (message.includes('Diagnostic Info:') || message.includes('Transaction hash:')) {
    message = 'Transaction failed. Please check your balance and try again, or contact support if the issue persists.';
  }

  // Limit message length
  if (message.length > 200) {
    message = message.substring(0, 200) + '...';
  }

  return {
    title: context?.operation ? `${context.operation} Failed` : 'Operation Failed',
    message: message.trim() || 'An unexpected error occurred. Please try again.'
  };
}

/**
 * Formats error for toast notification
 * @param error - The error object or message string
 * @param context - Additional context about the operation
 * @returns Formatted error for toast
 */
export function formatErrorForToast(
  error: any,
  context?: {
    operation?: string;
    amount?: string;
    balance?: string;
    stakedAmount?: string;
  }
) {
  return formatUserError(error, context);
}

