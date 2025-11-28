import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle, TrendingUp, Download, FileText, Shield, Home } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string; // CSS selector for highlighting
}

interface OnboardingProps {
  isFirstTime: boolean;
  onComplete: () => void;
}

export function Onboarding({ isFirstTime, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isFirstTime) {
      // Small delay to ensure page is loaded
      setTimeout(() => setIsVisible(true), 500);
    }
  }, [isFirstTime]);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Dr. Birdy Books Protocol!',
      description: 'We\'re excited to have you here. This quick guide will help you get started with our DeFi education platform.',
      icon: <Home className="h-8 w-8 text-blue-600" />,
    },
    {
      id: 'staking',
      title: 'Stake Your Tokens',
      description: 'Stake your DBB tokens to earn tier access. Higher tiers unlock more premium educational content. Visit the Staking page to get started.',
      icon: <TrendingUp className="h-8 w-8 text-green-600" />,
      target: 'a[href="/staking"]',
    },
    {
      id: 'content',
      title: 'Access Premium Content',
      description: 'Download educational materials based on your tier level. PDFs, videos, courses, and more await you on the Content page.',
      icon: <Download className="h-8 w-8 text-purple-600" />,
      target: 'a[href="/content"]',
    },
    {
      id: 'blog',
      title: 'Read Our Blog',
      description: 'Stay updated with the latest educational content, DeFi insights, and protocol updates. Check out our Blog section regularly.',
      icon: <FileText className="h-8 w-8 text-orange-600" />,
      target: 'a[href="/blog"]',
    },
    {
      id: 'tier',
      title: 'Upgrade Your Tier',
      description: 'Want more access? Upgrade your tier by staking more tokens. Visit the Tier page to see available tiers and their benefits.',
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      target: 'a[href="/tier"]',
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'You now know the basics. Start staking, explore content, and enjoy your learning journey. Need help? Use the feedback button anytime!',
      icon: <CheckCircle className="h-8 w-8 text-green-600" />,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={handleSkip} />
      
      {/* Onboarding Card */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg mx-4">
        <div className="bg-white rounded-lg shadow-2xl p-6 relative">
          {/* Close Button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(((currentStep + 1) / steps.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              {step.icon}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {step.title}
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-blue-600 w-8'
                    : index < currentStep
                    ? 'bg-green-500 w-2'
                    : 'bg-gray-300 w-2'
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                isFirstStep
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Skip Tour
            </button>

            <button
              onClick={handleNext}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <CheckCircle className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

