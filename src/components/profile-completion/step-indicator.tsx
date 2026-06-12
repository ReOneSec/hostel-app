"use client";

import { CheckCircle2 } from "lucide-react";

interface Step {
  id: number;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  transition-all duration-300 
                  ${
                    isCompleted
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : isCurrent
                        ? "bg-primary/10 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </div>
              <div className="text-center mt-2 hidden sm:block">
                <p
                  className={`text-xs font-medium ${
                    isCurrent
                      ? "text-primary"
                      : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 mx-2 mt-[-20px] sm:mt-0">
                <div
                  className={`h-0.5 rounded-full transition-colors duration-300 ${
                    isCompleted ? "bg-primary" : "bg-muted"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
