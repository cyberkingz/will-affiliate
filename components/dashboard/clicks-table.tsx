'use client'

import React, { useState } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface ClickData {
  id: string
  dateTime: string
  offerName: string
  subId: string
  subId2: string
}

interface ClicksTableProps {
  data: ClickData[]
  isLoading?: boolean
  totalCount?: number
}

export const ClicksTable = React.memo(function ClicksTable({ data, isLoading = false, totalCount }: ClicksTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageSize, setPageSize] = useState(10)

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const columns: ColumnDef<ClickData>[] = [
    {
      accessorKey: 'dateTime',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="text-neutral-300 hover:text-neutral-100"
        >
          Date & Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-neutral-200">
          {formatDateTime(row.getValue('dateTime'))}
        </div>
      ),
    },
    {
      accessorKey: 'offerName',
      header: 'Offer Name',
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-blue-500 text-white border-blue-500">
          {row.getValue('offerName')}
        </Badge>
      ),
    },
    {
      accessorKey: 'subId',
      header: 'Sub ID',
      cell: ({ row }) => (
        <div className="text-neutral-200">
          {row.getValue('subId') || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'subId2',
      header: 'Sub ID 2',
      cell: ({ row }) => (
        <div className="text-neutral-200">
          {row.getValue('subId2') || '-'}
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      // Handle pagination updates if needed
    },
  })

  if (isLoading) {
    return (
      <Card className="bg-neutral-950 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-neutral-100 flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            Clicks
            <Badge variant="secondary" className="bg-blue-500 text-white">
              {totalCount || 0}
            </Badge>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" className="text-neutral-400">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-neutral-800 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-950 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-neutral-100 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          Clicks
          <Badge variant="secondary" className="bg-blue-500 text-white">
            {totalCount || data.length}
          </Badge>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-neutral-200">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <div className="rounded-md border border-neutral-800">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-neutral-800 hover:bg-neutral-900">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="text-neutral-300">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="border-neutral-800 hover:bg-neutral-900"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="text-neutral-200">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="border-neutral-800">
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-neutral-400"
                    >
                      No clicks found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-neutral-400">
              1-{Math.min(pageSize, table.getFilteredRowModel().rows.length)} of {totalCount || table.getFilteredRowModel().rows.length}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-neutral-400">Items per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="text-neutral-400 hover:text-neutral-200"
                >
                  &lt;
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="text-neutral-400 hover:text-neutral-200"
                >
                  &gt;
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-neutral-400 hover:text-neutral-200"
                >
                  &gt;&gt;
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})