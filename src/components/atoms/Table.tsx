import React from "react";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden md:block overflow-visible rounded-xl border border-gray-stroke bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <table className="w-full text-left">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gray-fill-light text-gray-text text-xs uppercase tracking-wide">
      {children}
    </thead>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
  index = 0,
}: {
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <tr
      className="border-t border-gray-stroke hover:bg-primary-fill/50 transition-colors animate-row-in"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 text-sm text-gray-text-dark ${className}`}>
      {children}
    </td>
  );
}