"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BookOpen, GraduationCap, FileText, LogOut, Plus, ChevronDown, ClipboardList } from 'lucide-react'
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
    first_name?: string
    last_name?: string
  } | null
  onSignOut?: () => void
}

// Get user initials from name or email
function getUserInitials(user: NavigationHeaderProps['user']): string {
  if (!user) return '?'

  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
  }
  if (user.first_name) {
    return user.first_name.substring(0, 2).toUpperCase()
  }
  // Fall back to email
  const emailName = user.email.split('@')[0]
  return emailName.substring(0, 2).toUpperCase()
}

export default function NavigationHeader({ user, onSignOut }: NavigationHeaderProps) {
  const pathname = usePathname()
  const initials = getUserInitials(user)

  // Prevent hydration mismatch by only rendering user-dependent UI after mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const isStudyGuidesActive = pathname === '/' || pathname?.startsWith('/my-guides') || pathname?.startsWith('/study-guide')
  const isGradingActive = pathname?.startsWith('/grade-exam') || pathname?.startsWith('/graded-exams') || pathname?.startsWith('/grade-report')

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
            {/* Navigation Dropdowns */}
            <nav className="flex items-center gap-2">
              {/* Study Guides Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isStudyGuidesActive ? 'secondary' : 'ghost'}
                    className={`h-10 ${
                      isStudyGuidesActive
                        ? 'bg-white/20 text-white hover:bg-white/30'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                    Study Guides
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/" className="flex items-center cursor-pointer">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Guide
                    </Link>
                  </DropdownMenuItem>
                  {mounted && user && (
                    <DropdownMenuItem asChild>
                      <Link href="/my-guides" className="flex items-center cursor-pointer">
                        <FileText className="h-4 w-4 mr-2" />
                        My Guides
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Grading Dropdown - Only for logged-in users */}
              {mounted && user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isGradingActive ? 'secondary' : 'ghost'}
                      className={`h-10 ${
                        isGradingActive
                          ? 'bg-white/20 text-white hover:bg-white/30'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <GraduationCap className="h-4 w-4 mr-2 flex-shrink-0" />
                      Grading
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/grade-exam" className="flex items-center cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" />
                        {user.user_type === 'teacher' ? 'Grade Exam' : 'Check My Work'}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/graded-exams" className="flex items-center cursor-pointer">
                        <ClipboardList className="h-4 w-4 mr-2" />
                        My Reports
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>

            {/* User Menu */}
            {mounted && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-10 h-10 rounded-full bg-white text-primary font-bold text-sm flex items-center justify-center hover:ring-2 hover:ring-white/50 transition-all duration-200 shadow-md"
                    aria-label="User menu"
                  >
                    {initials}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-1">{user.user_type}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut} className="text-red-600 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
