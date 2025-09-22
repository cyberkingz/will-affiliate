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
import { ArrowUpDown, Download, ChevronLeft, ChevronRight } from 'lucide-react'
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

export interface ConversionData {
  id: string
  date: string
  time: string
  offerName: string
  subId: string
  subId2: string
  campaignId?: string
  price: number
}

interface ConversionsTableProps {
  data: ConversionData[]
  isLoading?: boolean
  totalCount?: number
  onExport?: () => void
}

const formatDateTime = (dateString: string) => {
  // Handle empty or invalid dates
  if (!dateString) {
    return { dateStr: 'Unknown', timeStr: 'Unknown' }
  }

  const date = new Date(dateString)
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString)
    return { dateStr: 'Invalid Date', timeStr: 'Invalid Date' }
  }

  const dateStr = date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  })
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
  return { dateStr, timeStr }
}

export const ConversionsTable = React.memo(({ data, isLoading, totalCount, onExport }: ConversionsTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns: ColumnDef<ConversionData>[] = [
    {
      accessorKey: 'date',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 text-neutral-300 hover:text-white"
          >
            Date & Time
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const { dateStr, timeStr } = formatDateTime(row.original.date)
        return (
          <div className="text-sm">
            <div className="text-neutral-200">{dateStr}</div>
            <div className="text-neutral-400">{timeStr}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'offerName',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 text-neutral-300 hover:text-white"
          >
            Offer Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const offerName = row.getValue('offerName') as string
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-500/30">
            {offerName}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'subId',
      header: 'Sub ID',
      cell: ({ row }) => {
        const subId = row.getValue('subId') as string
        return (
          <span className="text-neutral-300 font-mono text-sm">
            {subId || '-'}
          </span>
        )
      },
    },
    {
      accessorKey: 'subId2',
      header: 'Sub ID 2',
      cell: ({ row }) => {
        const subId2 = row.getValue('subId2') as string
        return (
          <span className={`font-mono text-sm ${subId2 ? 'text-neutral-300' : 'text-neutral-500 italic'}`}>
            {subId2 || 'N/A'}
          </span>
        )
      },
    },
    {
      accessorKey: 'price',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 text-neutral-300 hover:text-white"
          >
            Price
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const price = row.getValue('price') as number
        return (
          <span className="text-green-400 font-semibold">
            ${price.toFixed(2)}
          </span>
        )
      },
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
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  if (isLoading) {
    return (
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            💰 Conversions
            <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-500/30">
              {totalCount?.toLocaleString() || '0'}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="text-neutral-300 border-neutral-700 hover:bg-neutral-800"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse"></div>
                <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-neutral-800 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-neutral-800 rounded animate-pulse"></div>
                <div className="h-4 w-20 bg-neutral-800 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
          💰 Conversions
          <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-500/30">
            {totalCount?.toLocaleString() || data.length.toLocaleString()}
          </Badge>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="text-neutral-300 border-neutral-700 hover:bg-neutral-800"
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-neutral-800">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-neutral-800 hover:bg-neutral-900">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="text-neutral-300">
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
                    data-state={row.getIsSelected() && 'selected'}
                    className="border-neutral-800 hover:bg-neutral-900/50"
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
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-neutral-400"
                  >
                    No conversions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-neutral-400">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              data.length
            )}{' '}
            of {data.length} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="text-neutral-300 border-neutral-700 hover:bg-neutral-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="text-neutral-300 border-neutral-700 hover:bg-neutral-800"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="text-neutral-300 border-neutral-700 hover:bg-neutral-800"
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="text-neutral-300 border-neutral-700 hover:bg-neutral-800"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

ConversionsTable.displayName = 'ConversionsTable'