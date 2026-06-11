import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      {icon && (
        <div className="text-slate-300 mb-5">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 mb-4 max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
