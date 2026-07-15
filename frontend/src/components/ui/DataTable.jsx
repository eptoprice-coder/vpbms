'use client';
import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// Generic, reusable table: sorting + client pagination + sticky header.
// Per-column options via columnDef.meta:
//   width      — fixed CSS width (e.g. '30%', '5rem'); the table uses fixed layout when any column sets it
//   className  — extra classes for both th and td (e.g. 'hidden md:table-cell')
//   wrap       — allow the cell content to wrap onto multiple lines (default: nowrap)
export default function DataTable({ columns, data, pageSize = 10, compact = false }) {
  const [sorting, setSorting] = useState([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const hasFixedWidths = columns.some((c) => c.meta?.width);
  const cellPad = compact ? 'px-2 py-2.5' : 'px-4 py-3';

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${hasFixedWidths ? 'table-fixed' : ''}`}>
          <thead className="sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const meta = header.column.columnDef.meta || {};
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={meta.width ? { width: meta.width } : undefined}
                      className={`${cellPad} text-left font-medium text-gray-500 dark:text-gray-400 cursor-pointer select-none align-bottom leading-tight ${meta.className || ''}`}
                    >
                      <div className="flex items-end gap-1">
                        <span className="break-words">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        {header.column.getIsSorted() === 'asc' && <ChevronUp size={14} className="shrink-0" />}
                        {header.column.getIsSorted() === 'desc' && <ChevronDown size={14} className="shrink-0" />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-brand-50/50 dark:hover:bg-gray-800/50">
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta || {};
                  return (
                    <td key={cell.id} className={`${cellPad} align-top ${meta.wrap ? 'break-words' : 'whitespace-nowrap'} ${meta.className || ''}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!table.getRowModel().rows.length && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm">
        <span className="text-gray-500">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </span>
        <div className="flex gap-2">
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="btn-secondary px-2 py-1">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="btn-secondary px-2 py-1">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
