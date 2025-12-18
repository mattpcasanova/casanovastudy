"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BookOpen, GraduationCap, FileText, User, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavigationHeaderProps {
  user?: {
    id: string
    email: string
    user_type: 'student' | 'teacher'
  } | null
  onSignOut?: () => void
  onSignIn?: () => void
}

export default function NavigationHeader({ user, onSignOut, onSignIn }: NavigationHeaderProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname?.startsWith(path)
  }

  return (
    <header className="bg-gradient-to-r from-primary via-secondary to-accent text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo - Bigger */}
          <Link href="/" className="transition-all duration-200 hover:scale-105">
            <Image
              src="/images/casanova-study-logo.png"
              alt="Casanova Study"
              width={280}
              height={105}
              className="h-16 w-auto md:h-20 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            />
          </Link>

          {/* Right side - Navigation and User Menu */}
          <div className="flex items-center gap-3">
            {/* Navigation Tabs */}
            <nav className="flex items-center gap-2">
              <Link href="/">
                <Button
                  variant={isActive('/') ? 'secondary' : 'ghost'}
                  className={`${
                    isActive('/')
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create Guide
                </Button>
              </Link>

              {user && (
                <Link href="/my-guides">
                  <Button
                    variant={isActive('/my-guides') ? 'secondary' : 'ghost'}
                    className={`${
                      isActive('/my-guides')
                        ? 'bg-white/20 text-white hover:bg-white/30'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    My Guides
                  </Button>
                </Link>
              )}

              {user?.user_type === 'teacher' && (
                <Link href="/grade-exam">
                  <Button
                    variant={isActive('/grade-exam') ? 'secondary' : 'ghost'}
                    className={`${
                      isActive('/grade-exam')
                        ? 'bg-white/20 text-white hover:bg-white/30'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Grade Exam
                  </Button>
                </Link>
              )}
            </nav>

            {/* User Menu / Sign In */}
            <div>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="bg-white/90 hover:bg-white text-gray-800">
                      <User className="h-4 w-4 mr-2" />
                      {user.email}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-2">
                      <p className="text-sm font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.user_type}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onSignOut} className="text-red-600 cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="secondary"
                  onClick={onSignIn}
                  className="bg-white/90 hover:bg-white text-gray-800"
                >
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
