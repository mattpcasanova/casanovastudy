"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BookOpen, GraduationCap, FileText, LogOut, Plus, ChevronDown, ClipboardList, Users, PenSquare, Menu, X, School, LayoutDashboard, CalendarDays } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/lib/auth'

// Get user initials from name or email
function getUserInitials(user: { email: string; first_name?: string; last_name?: string } | null): string {
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

export default function NavigationHeader() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const initials = getUserInitials(user)

  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const isStudyGuidesActive = pathname?.startsWith('/create-study-guide') || pathname?.startsWith('/my-guides') || pathname?.startsWith('/study-guide')
  const isMyTeachersActive = (pathname?.startsWith('/my-teachers') || pathname?.startsWith('/teacher')) && !pathname?.startsWith('/teacher/classes')
  const isMyStudentsActive = pathname?.startsWith('/my-students')
  const isMyClassesActive = pathname?.startsWith('/teacher/classes')
  const isStudentClassesActive = pathname?.startsWith('/my-classes') || (pathname?.startsWith('/classes') && !pathname?.startsWith('/classes/join'))
  const isJoinClassActive = pathname?.startsWith('/classes/join')
  const isDashboardActive = pathname === '/' || pathname?.startsWith('/dashboard')
  const isCalendarActive = pathname?.startsWith('/calendar')
  const isGradingActive = pathname?.startsWith('/grade-exam') || pathname?.startsWith('/graded-exams') || pathname?.startsWith('/grade-report')
  const isTeacher = user?.user_type === 'teacher'

  return (
    <header className="relative bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 text-white shadow-lg sticky top-0 z-50">
      {/* Luminous depth — soft glows lift the bar from flat to premium */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-52 w-[30rem] rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="absolute -bottom-24 left-8 h-52 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>
      <div className="container relative z-10 mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          {/* Logo lockup — the brand mark is a dim neon-on-dark image, so we show
              the (brightened) icon on a dark chip and set the wordmark as crisp
              white text, guaranteeing it reads on the blue bar. */}
          <Link href="/" className="group flex items-center gap-2 transition-transform duration-200 hover:scale-[1.02]">
            <Image
              src="/images/casanova-study-icon.png"
              alt="Casanova Study"
              width={80}
              height={80}
              className="h-10 w-auto mix-blend-screen [filter:brightness(1.5)_saturate(1.2)]"
            />
            <span className="text-xl font-bold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
              Casanova Study
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <nav className="flex items-center gap-2">
              {/* Study Guides Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isStudyGuidesActive ? 'secondary' : 'ghost'}
                    className={`h-10 rounded-full px-4 transition-all duration-200 ${
                      isStudyGuidesActive
                        ? 'bg-white/20 text-white shadow-sm ring-1 ring-inset ring-white/25 hover:bg-white/25'
                        : 'text-white/90 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                    Study Guides
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/create-study-guide" className="flex items-center cursor-pointer">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Guide
                    </Link>
                  </DropdownMenuItem>
                  {mounted && user && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/create-guide" className="flex items-center cursor-pointer">
                          <PenSquare className="h-4 w-4 mr-2" />
                          Create Custom Guide
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/my-guides" className="flex items-center cursor-pointer">
                          <FileText className="h-4 w-4 mr-2" />
                          My Guides
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Grading Dropdown - Only for teachers */}
              {mounted && user && isTeacher && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isGradingActive ? 'secondary' : 'ghost'}
                      className={`h-10 rounded-full px-4 transition-all duration-200 ${
                        isGradingActive
                          ? 'bg-white/20 text-white shadow-sm ring-1 ring-inset ring-white/25 hover:bg-white/25'
                          : 'text-white/90 hover:text-white hover:bg-white/10'
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
                        Grade Exam
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

              {/* Classes Dropdown - For logged-in students */}
              {mounted && user && !isTeacher && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isStudentClassesActive || isJoinClassActive || isDashboardActive || isCalendarActive ? 'secondary' : 'ghost'}
                      className={`h-10 rounded-full px-4 transition-all duration-200 ${
                        isStudentClassesActive || isJoinClassActive || isDashboardActive || isCalendarActive
                          ? 'bg-white/20 text-white shadow-sm ring-1 ring-inset ring-white/25 hover:bg-white/25'
                          : 'text-white/90 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <School className="h-4 w-4 mr-2 flex-shrink-0" />
                      Classes
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/" className="flex items-center cursor-pointer">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/my-classes" className="flex items-center cursor-pointer">
                        <School className="h-4 w-4 mr-2" />
                        My Classes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/calendar" className="flex items-center cursor-pointer">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Calendar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/classes/join" className="flex items-center cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" />
                        Join Class
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* My Teachers Button - For logged-in students */}
              {mounted && user && !isTeacher && (
                <Button
                  variant={isMyTeachersActive ? 'secondary' : 'ghost'}
                  className={`h-10 rounded-full px-4 transition-all duration-200 ${
                    isMyTeachersActive
                      ? 'bg-white/20 text-white shadow-sm ring-1 ring-inset ring-white/25 hover:bg-white/25'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                  asChild
                >
                  <Link href="/my-teachers">
                    <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                    My Teachers
                  </Link>
                </Button>
              )}

              {/* Classes Dropdown - For teachers */}
              {mounted && user && isTeacher && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isMyClassesActive || isDashboardActive || isCalendarActive ? 'secondary' : 'ghost'}
                      className={`h-10 rounded-full px-4 transition-all duration-200 ${
                        isMyClassesActive || isDashboardActive || isCalendarActive
                          ? 'bg-white/20 text-white shadow-sm ring-1 ring-inset ring-white/25 hover:bg-white/25'
                          : 'text-white/90 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <School className="h-4 w-4 mr-2 flex-shrink-0" />
                      Classes
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/" className="flex items-center cursor-pointer">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/teacher/classes" className="flex items-center cursor-pointer">
                        <School className="h-4 w-4 mr-2" />
                        My Classes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/calendar" className="flex items-center cursor-pointer">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Calendar
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* My Students Button - For teachers */}
              {mounted && user && isTeacher && (
                <Button
                  variant={isMyStudentsActive ? 'secondary' : 'ghost'}
                  className={`h-10 rounded-full px-4 transition-all duration-200 ${
                    isMyStudentsActive
                      ? 'bg-white/20 text-white shadow-sm ring-1 ring-inset ring-white/25 hover:bg-white/25'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                  asChild
                >
                  <Link href="/my-students">
                    <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                    My Students
                  </Link>
                </Button>
              )}
            </nav>

            {/* User Menu */}
            {mounted && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-10 h-10 rounded-full bg-white text-primary font-bold text-sm flex items-center justify-center ring-2 ring-white/40 hover:ring-white/70 hover:scale-105 transition-all duration-200 shadow-md"
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
                  <DropdownMenuItem onClick={signOut} className="text-red-600 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile: user avatar + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {mounted && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-9 h-9 rounded-full bg-white text-primary font-bold text-xs flex items-center justify-center shadow-md"
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
                  <DropdownMenuItem onClick={signOut} className="text-red-600 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/20 bg-white/10 backdrop-blur-sm">
          <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
            {/* Study Guides section */}
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider px-3 pt-2 pb-1">Study Guides</p>
            <Link
              href="/create-study-guide"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                pathname?.startsWith('/create-study-guide') ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Create Guide</span>
            </Link>
            {mounted && user && (
              <>
                <Link
                  href="/create-guide"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname === '/create-guide' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <PenSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Create Custom Guide</span>
                </Link>
                <Link
                  href="/my-guides"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname?.startsWith('/my-guides') ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">My Guides</span>
                </Link>
              </>
            )}

            {/* Grading section - Teachers only */}
            {mounted && user && isTeacher && (
              <>
                <div className="h-px bg-white/10 my-1" />
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider px-3 pt-2 pb-1">Grading</p>
                <Link
                  href="/grade-exam"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname === '/grade-exam' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <GraduationCap className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Grade Exam</span>
                </Link>
                <Link
                  href="/graded-exams"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname?.startsWith('/graded-exams') ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <ClipboardList className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">My Reports</span>
                </Link>
              </>
            )}

            {/* Classes & Teachers - Students only */}
            {mounted && user && !isTeacher && (
              <>
                <div className="h-px bg-white/10 my-1" />
                <Link
                  href="/"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isDashboardActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Dashboard</span>
                </Link>
                <Link
                  href="/my-classes"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isStudentClassesActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <School className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">My Classes</span>
                </Link>
                <Link
                  href="/calendar"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isCalendarActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <CalendarDays className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Calendar</span>
                </Link>
                <Link
                  href="/classes/join"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isJoinClassActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Join Class</span>
                </Link>
                <Link
                  href="/my-teachers"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isMyTeachersActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">My Teachers</span>
                </Link>
              </>
            )}

            {/* My Classes & My Students - Teachers only */}
            {mounted && user && isTeacher && (
              <>
                <Link
                  href="/"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isDashboardActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Dashboard</span>
                </Link>
                <Link
                  href="/teacher/classes"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isMyClassesActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <School className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">My Classes</span>
                </Link>
                <Link
                  href="/calendar"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isCalendarActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <CalendarDays className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Calendar</span>
                </Link>
                <Link
                  href="/my-students"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isMyStudentsActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">My Students</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
