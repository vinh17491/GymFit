import React from "react";

interface SkeletonProps {
  className?: string;
  count?: number;
  height?: string | number;
  width?: string | number;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  count = 1,
  height = "1rem",
  width = "100%",
  circle = false,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 rounded ${circle ? "rounded-full" : ""} ${className}`}
          style={{ height, width, marginBottom: count > 1 ? "0.5rem" : 0 }}
        />
      ))}
    </>
  );
};

interface PageSkeletonProps {
  rows?: number;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ rows = 8 }) => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <Skeleton height="2rem" width="40%" />
      <Skeleton height="1rem" width="60%" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} height="1rem" width={`${70 + (i % 3) * 10}%`} />
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <Skeleton height="12rem" width="100%" />
      <Skeleton height="1.25rem" width="60%" />
      <Skeleton height="0.875rem" width="80%" />
      <Skeleton height="0.875rem" width="40%" />
    </div>
  );
};

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <Skeleton height="0.875rem" width="50%" />
            <Skeleton height="1.5rem" width="30%" />
          </div>
        ))}
      </div>
      <Skeleton height="16rem" width="100%" />
    </div>
  );
};