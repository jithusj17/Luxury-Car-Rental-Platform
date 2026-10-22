import { cn } from "@/shared/lib/utils";

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
};

/**
 * Dashboard table from 37/41 (dark header row, divided rows). On small screens each row
 * becomes a stacked card with the column header as a label.
 */
export function DataTable<T>({ caption, columns, rows, rowKey, className }: DataTableProps<T>) {
  return (
    <div className={cn("w-full", className)}>
      <table className="w-full border-separate border-spacing-0 text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="hidden md:table-header-group">
          <tr>
            {columns.map((column, i) => (
              <th
                key={column.header}
                scope="col"
                className={cn(
                  "bg-heading px-4 py-2.5 font-heading text-xs font-medium text-white",
                  i === 0 && "rounded-l-md",
                  i === columns.length - 1 && "rounded-r-md",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="flex flex-col gap-2 border-b border-border py-4 md:table-row md:py-0">
              {columns.map((column) => (
                <td key={column.header} className={cn("align-top md:border-b md:border-border md:px-4 md:py-4", column.className)}>
                  <span className="mb-1 block text-xs text-icon md:hidden">{column.header}</span>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
