"use client"

import React, { useState } from "react"
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  LogOut,
  Users,
  Store
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { logout } from "@/app/auth/actions"
import { Database } from "@/types/supabase"

type User = Database['public']['Tables']['users']['Row']

interface DashboardLayoutProps {
  children: React.ReactNode
  user: User
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <LayoutDashboard className="text-neutral-300 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Shopify Stores",
      href: "/stores",
      icon: (
        <Store className="text-neutral-300 h-5 w-5 flex-shrink-0" />
      ),
    },
  ]

  // Add admin links if user is admin
  if (user.role === 'admin') {
    links.push(
      {
        label: "User Management",
        href: "/admin/users",
        icon: (
          <Users className="text-neutral-300 h-5 w-5 flex-shrink-0" />
        ),
      }
    )
  }

  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="flex h-screen bg-neutral-950 overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10 h-full">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="pb-4">
            <SidebarLink
              link={{
                label: user.full_name || user.email,
                href: "#",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-neutral-600 flex items-center justify-center">
                    <span className="text-xs font-medium text-neutral-200">
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                ),
              }}
            />
            <button
              onClick={handleLogout}
              className="flex items-center justify-start gap-2 group/sidebar py-2 w-full text-left"
            >
              <LogOut className="text-neutral-300 h-5 w-5 flex-shrink-0" />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
              >
                Logout
              </motion.span>
            </button>
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex-1 overflow-auto">
        <div className="min-h-full bg-neutral-950">
          {children}
        </div>
      </div>
    </div>
  )
}

const Logo = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-neutral-200 py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-neutral-200 whitespace-pre"
      >
        WillAffiliate
      </motion.span>
    </Link>
  )
}

const LogoIcon = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-neutral-200 py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  )
}
