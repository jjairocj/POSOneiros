"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Text search box placeholder. Defaults to the product-catalog wording. */
  filterPlaceholder?: string
  /** No-results message for the desktop table. */
  emptyMessage?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterPlaceholder = "Filtrar por nombre de producto...",
  emptyMessage = "No se encontraron productos o categorías. Añade uno nuevo o ajusta los filtros.",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  // Controlled (not table-internal) pagination state: editing a row triggers
  // router.refresh(), which hands this table a new `data` array reference —
  // with table-internal state, react-table's autoResetPageIndex snaps that
  // back to page 1 on every edit. Controlling it ourselves + turning that
  // auto-reset off keeps the user on the page they were on.
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  })

  // If the current page no longer exists (e.g. a row was deleted, or a
  // filter now matches fewer rows), fall back to the last real page instead
  // of showing a blank one — this is the one case autoResetPageIndex:false
  // needs a manual clamp for.
  const pageCount = table.getPageCount()
  React.useEffect(() => {
    if (pageCount > 0 && pagination.pageIndex > pageCount - 1) {
      setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }))
    }
  }, [pageCount, pagination.pageIndex])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder={filterPlaceholder}
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm rounded-xl h-12"
        />
        {/* Placeholder for future Category filters or advanced filters */}
      </div>
      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <div key={row.id} className="bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-5 shadow-sm space-y-3 flex flex-col">
                {[...row.getVisibleCells()].sort((a, b) => {
                  // Title cell first, actions last, everything else keeps
                  // its table-column order in between.
                  const rank = (id: string) => (id === "name" ? 0 : id === "actions" ? 2 : 1);
                  return rank(a.column.id) - rank(b.column.id);
                }).map((cell) => {
                  const isAction = cell.column.id === "actions";
                  // "name" is the row's identity — give it a title treatment
                  // instead of stacking it as just another labeled field.
                  const isTitle = cell.column.id === "name";
                  const headerName =
                    cell.column.columnDef.meta?.label ??
                    (typeof cell.column.columnDef.header === "string"
                      ? cell.column.columnDef.header
                      : cell.column.id.charAt(0).toUpperCase() + cell.column.id.slice(1));

                  if (isTitle) {
                    return (
                      <div key={cell.id} className="text-base font-bold">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  }

                  return (
                    <div key={cell.id} className={`flex ${isAction ? 'justify-end mt-2 pt-3 border-t border-border/50' : 'justify-between items-center gap-4'}`}>
                      {!isAction && (
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                          {headerName}
                        </span>
                      )}
                      <div className={`text-sm ${!isAction ? 'font-bold text-right' : ''}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
        ) : (
            <div className="bg-card border rounded-2xl p-8 text-center text-muted-foreground">
                No se encontraron datos.
            </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="font-semibold text-foreground py-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-accent/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end gap-3 py-4">
        <p className="text-sm text-muted-foreground">
          Página {pageCount === 0 ? 0 : pagination.pageIndex + 1} de {pageCount}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-xl"
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-xl"
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
