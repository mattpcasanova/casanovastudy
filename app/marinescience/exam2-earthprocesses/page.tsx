"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronDown, ChevronUp, BookOpen, Download, Share2, Star, CheckCircle, Circle, AlertTriangle, Calculator, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface StudyItem {
  id: string
  completed: boolean
}

interface PracticeQuestion {
  id: string
  type: 'multiple-choice' | 'short-answer' | 'calculation'
  question: string
  options?: string[]
  correctAnswer: string
  explanation?: string
}

export default function MarineScienceStudyGuide() {
  const [studyItems, setStudyItems] = useState<StudyItem[]>([
    { id: "earth-layers", completed: false },
    { id: "plate-tectonics", completed: false },
    { id: "weathering-erosion", completed: false },
    { id: "tides", completed: false },
    { id: "ocean-currents", completed: false },
    { id: "el-nino", completed: false },
    { id: "coastal-zones", completed: false },
    { id: "definitions", completed: false }
  ])

  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({
    'earth-layers': false,
    'crust-difference': false,
    'plate-boundaries': false,
    'plate-evidence': false,
    'subduction-zone': false,
    'weathering-types': false,
    'weathering-erosion-diff': false,
    'tidal-range-calc': false,
    'spring-neap-tides': false,
    'coriolis-effect': false,
    'surface-deep-currents': false,
    'upwelling': false,
    'el-nino-conditions': false,
    'littoral-zone': false,
  })

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const toggleChecklistItem = (itemId: string) => {
    setChecklistItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  // Practice Questions Data
  const practiceQuestions: PracticeQuestion[] = [
    {
      id: 'q1',
      type: 'multiple-choice',
      question: 'The outermost layer of Earth\'s crust is composed primarily of:',
      options: [
        'Granite and similar rocks in oceanic crust',
        'Basaltic rocks in continental crust', 
        'Basaltic rocks in oceanic crust',
        'Iron and magnesium in continental crust'
      ],
      correctAnswer: 'Basaltic rocks in oceanic crust',
      explanation: 'Oceanic crust is primarily composed of basaltic rocks, which are denser than the granitic rocks found in continental crust.'
    },
    {
      id: 'q2',
      type: 'short-answer',
      question: 'Define: Subduction zone',
      correctAnswer: 'Area where one tectonic plate slides beneath another at a convergent boundary',
      explanation: 'Subduction zones are characterized by deep ocean trenches and volcanic activity as the denser oceanic plate is forced under the less dense continental plate.'
    },
    {
      id: 'q3',
      type: 'calculation',
      question: 'Calculate the tidal range if high tide = 3.2m and low tide = 0.8m',
      correctAnswer: '2.4m',
      explanation: 'Tidal range = High tide - Low tide = 3.2m - 0.8m = 2.4m. Always remember to show your working in exam calculations.'
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      question: 'Which type of plate boundary is associated with deep ocean trenches?',
      options: [
        'Divergent boundaries',
        'Transform boundaries',
        'Convergent boundaries',
        'All boundary types'
      ],
      correctAnswer: 'Convergent boundaries',
      explanation: 'Convergent boundaries, where plates collide, create deep ocean trenches through subduction processes.'
    },
    {
      id: 'q5',
      type: 'short-answer',
      question: 'Explain the difference between spring tides and neap tides.',
      correctAnswer: 'Spring tides occur during full/new moon when Sun-Moon-Earth are aligned, creating the largest tidal range. Neap tides occur during first/last quarter moon when Sun and Moon are at right angles, creating the smallest tidal range.',
      explanation: 'Remember: Spring tides have nothing to do with the season - they\'re named for the way water "springs" higher up the shore.'
    },
    {
      id: 'q6',
      type: 'multiple-choice',
      question: 'Surface ocean currents are primarily driven by:',
      options: [
        'Density differences',
        'Temperature variations',
        'Wind patterns',
        'Tidal forces'
      ],
      correctAnswer: 'Wind patterns',
      explanation: 'Surface currents are driven by wind, while deep currents are driven by density differences (temperature and salinity).'
    },
    {
      id: 'q7',
      type: 'multiple-choice',
      question: 'During El Niño conditions, what happens to upwelling along the South American coast?',
      options: [
        'Upwelling increases significantly',
        'Upwelling remains the same',
        'Upwelling decreases or stops',
        'Upwelling only occurs at night'
      ],
      correctAnswer: 'Upwelling decreases or stops',
      explanation: 'El Niño weakens trade winds, which reduces or stops the upwelling of cold, nutrient-rich water along the South American coast.'
    },
    {
      id: 'q8',
      type: 'short-answer',
      question: 'Name TWO ways that El Niño conditions impact marine ecosystems.',
      correctAnswer: '1) Reduced fish populations due to lack of nutrients in warm water, 2) Disrupted food chain from less phytoplankton',
      explanation: 'El Niño stops upwelling, which means less cold, nutrient-rich water reaches the surface. This reduces phytoplankton growth, which disrupts the entire marine food chain and causes fish populations to decline.'
    },
    {
      id: 'q9',
      type: 'multiple-choice',
      question: 'What is the main difference between weathering and erosion?',
      options: [
        'Weathering moves materials, erosion breaks them down',
        'Weathering breaks down rocks in place, erosion transports materials',
        'Weathering only affects igneous rocks, erosion affects all rocks',
        'There is no difference between weathering and erosion'
      ],
      correctAnswer: 'Weathering breaks down rocks in place, erosion transports materials',
      explanation: 'Weathering is the breaking down of rocks without movement, while erosion involves the transportation of broken materials to new locations.'
    },
    {
      id: 'q10',
      type: 'calculation',
      question: 'If the high tide is 4.1m and the low tide is 1.3m, calculate the tidal range and show your working.',
      correctAnswer: '2.8m',
      explanation: 'Tidal range = High tide - Low tide = 4.1m - 1.3m = 2.8m. Always remember to show your working step by step in exam calculations.'
    }
  ]

  // Practice Questions State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [shuffledQuestions, setShuffledQuestions] = useState(practiceQuestions)

  const shuffleQuestions = () => {
    const shuffled = [...practiceQuestions].sort(() => Math.random() - 0.5)
    setShuffledQuestions(shuffled)
    setCurrentQuestionIndex(0)
    setUserAnswer('')
    setShowAnswer(false)
  }

  const handleAnswerSubmit = () => {
    setShowAnswer(true)
  }

  const nextQuestion = () => {
    setCurrentQuestionIndex((prev) => (prev + 1) % shuffledQuestions.length)
    setUserAnswer('')
    setShowAnswer(false)
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex]

  const toggleStudyItem = (itemId: string) => {
    setStudyItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, completed: !item.completed }
          : item
      )
    )
  }

  const completedCount = studyItems.filter(item => item.completed).length
  const progressPercentage = (completedCount / studyItems.length) * 100

  const printGuide = () => {
    window.print()
  }

  const shareGuide = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AICE Marine Science - Earth Processes Study Guide',
          text: 'Check out this comprehensive study guide for AICE Marine Science Chapter 2!',
          url: window.location.href
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="relative">
            {/* Logo in top left */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0">
              <Link href="/" className="block transition-all duration-200 hover:scale-105">
                <Image
                  src="/images/casanova-study-logo.png"
                  alt="Casanova Study"
                  width={384}
                  height={144}
                  className="h-40 w-64 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer"
                />
              </Link>
            </div>

            {/* Centered content */}
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-2">
                AICE Marine Science
              </h1>
              <h2 className="text-xl opacity-90">Chapter 2: Earth Processes - Study Guide</h2>
              <p className="mt-4 text-sm opacity-75">Interactive study guide with progress tracking</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Study Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress: {completedCount}/{studyItems.length} sections</span>
                <Badge variant={progressPercentage === 100 ? "default" : "secondary"}>
                  {Math.round(progressPercentage)}%
                </Badge>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              {progressPercentage === 100 && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Congratulations! You've completed all sections. You're ready for the exam! 🎉
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exam Format */}
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">📝 Exam Format (70 marks total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Section A: Multiple Choice</span>
                  <Badge variant="outline">10 marks</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Section B: Short Answer</span>
                  <Badge variant="outline">20 marks</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Section C: Structured Questions</span>
                  <Badge variant="outline">25 marks</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Section D: Extended Response</span>
                  <Badge variant="outline">15 marks</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Study Sections */}
        <div className="space-y-4">
          {/* Earth's Structure */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('earth-structure')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🌍 Earth's Structure
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('earth-layers')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'earth-layers')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('earth-structure') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('earth-structure') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Three Main Layers:</h4>
                    <ul className="space-y-2 ml-4">
                      <li>
                        <strong className="text-blue-600">CRUST</strong> - Outermost layer
                        <ul className="ml-4 mt-1 space-y-1">
                          <li><strong>Oceanic:</strong> 5-10 km, basaltic rocks, <strong>DENSER</strong></li>
                          <li>Continental: 30-70 km, granite rocks, less dense</li>
                        </ul>
                      </li>
                      <li><strong className="text-blue-600">MANTLE</strong> - ~2,900 km thick, convection currents drive plate movement</li>
                      <li><strong className="text-blue-600">CORE</strong> - Outer (liquid iron/nickel), Inner (solid)</li>
                    </ul>
                  </div>
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <Star className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <strong>💡 EXAM TIP:</strong> Oceanic crust = basaltic & denser than continental
                    </AlertDescription>
                  </Alert>
                  
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>🔥 CRITICAL EXAM POINT:</strong> 
                      <ul className="list-disc list-inside mt-2 text-sm">
                        <li><strong>Oceanic crust:</strong> 5-10km thick, basaltic rocks, DENSER</li>
                        <li><strong>Continental crust:</strong> 30-70km thick, granite rocks, less dense</li>
                        <li><strong>Why oceanic is denser:</strong> Basaltic rocks contain more iron and magnesium</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Plate Tectonics */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('plate-tectonics')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🗺️ Plate Tectonics
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('plate-tectonics')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'plate-tectonics')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('plate-tectonics') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('plate-tectonics') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Evidence Supporting Theory:</h4>
                    <ol className="space-y-1 ml-4">
                      <li>1. Jigsaw fit of continents</li>
                      <li>2. Matching fossils across continents</li>
                      <li>3. <strong>Seafloor spreading</strong> at mid-ocean ridges</li>
                      <li>4. <strong>Paleomagnetic stripes</strong> (alternating magnetic patterns)</li>
                      <li>5. Age of oceanic crust (youngest at ridges)</li>
                    </ol>
                  </div>
                  
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                      <strong>❗ KEY FACT:</strong> Seafloor spreading did NOT support Wegener's original theory - discovered in 1960s
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Three Types of Plate Boundaries:</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-blue-600 text-white">
                            <th className="border border-gray-300 p-2 text-left">Boundary Type</th>
                            <th className="border border-gray-300 p-2 text-left">Movement</th>
                            <th className="border border-gray-300 p-2 text-left">Key Features</th>
                            <th className="border border-gray-300 p-2 text-left">Example</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="even:bg-gray-50">
                            <td className="border border-gray-300 p-2"><strong>DIVERGENT</strong></td>
                            <td className="border border-gray-300 p-2">Plates move APART ←→</td>
                            <td className="border border-gray-300 p-2">Mid-ocean ridges, seafloor spreading</td>
                            <td className="border border-gray-300 p-2">Mid-Atlantic Ridge</td>
                          </tr>
                          <tr className="even:bg-gray-50">
                            <td className="border border-gray-300 p-2"><strong>CONVERGENT</strong></td>
                            <td className="border border-gray-300 p-2">Plates COLLIDE →←</td>
                            <td className="border border-gray-300 p-2"><strong>DEEP TRENCHES</strong>, volcanoes</td>
                            <td className="border border-gray-300 p-2">Mariana Trench</td>
                          </tr>
                          <tr className="even:bg-gray-50">
                            <td className="border border-gray-300 p-2"><strong>TRANSFORM</strong></td>
                            <td className="border border-gray-300 p-2">Plates SLIDE PAST ↑↓</td>
                            <td className="border border-gray-300 p-2">Earthquakes, NO volcanoes</td>
                            <td className="border border-gray-300 p-2">San Andreas Fault</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Weathering & Erosion */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('weathering-erosion')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🪨 Weathering & Erosion
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('weathering-erosion')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'weathering-erosion')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('weathering-erosion') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('weathering-erosion') && (
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <h4 className="font-semibold mb-2">KEY DIFFERENCE:</h4>
                      <ul className="space-y-1">
                        <li><strong>WEATHERING:</strong> Breaking down rocks IN PLACE (no movement)</li>
                        <li><strong>EROSION:</strong> TRANSPORTATION of broken materials</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Three Types of Weathering:</h4>
                    <ol className="space-y-2 ml-4">
                      <li>
                        <strong>Physical/Mechanical:</strong> Breaks rocks without changing chemistry
                        <ul className="ml-4 mt-1"><li>Freeze-thaw, temperature changes, wave action</li></ul>
                      </li>
                      <li>
                        <strong>Chemical:</strong> Changes rock composition
                        <ul className="ml-4 mt-1"><li>Dissolution, oxidation, hydrolysis</li></ul>
                      </li>
                      <li>
                        <strong>Biological/Organic:</strong> Living things break down rocks
                        <ul className="ml-4 mt-1"><li>Plant roots, lichens, burrowing animals</li></ul>
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Four Agents of Erosion:</h4>
                    <ul className="space-y-1 ml-4">
                      <li><strong>Water</strong> (most important for marine)</li>
                      <li><strong>Ice/Glaciers</strong></li>
                      <li>Wind</li>
                      <li>Gravity</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Tides */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('tides')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🌊 Tides
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('tides')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'tides')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('tides') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('tides') && (
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-600 text-white p-4 rounded-lg text-center">
                    <div className="text-xl font-bold">TIDAL RANGE = HIGH TIDE - LOW TIDE</div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Spring Tides vs Neap Tides:</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-blue-600 text-white">
                            <th className="border border-gray-300 p-2 text-left">Tide Type</th>
                            <th className="border border-gray-300 p-2 text-left">Moon Phase</th>
                            <th className="border border-gray-300 p-2 text-left">Alignment</th>
                            <th className="border border-gray-300 p-2 text-left">Range</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="even:bg-gray-50">
                            <td className="border border-gray-300 p-2"><strong>SPRING TIDES</strong></td>
                            <td className="border border-gray-300 p-2">Full or New Moon</td>
                            <td className="border border-gray-300 p-2">Sun-Moon-Earth ALIGNED</td>
                            <td className="border border-gray-300 p-2"><strong>LARGEST</strong></td>
                          </tr>
                          <tr className="even:bg-gray-50">
                            <td className="border border-gray-300 p-2"><strong>NEAP TIDES</strong></td>
                            <td className="border border-gray-300 p-2">First/Last Quarter</td>
                            <td className="border border-gray-300 p-2">Sun & Moon at RIGHT ANGLES</td>
                            <td className="border border-gray-300 p-2"><strong>SMALLEST</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Alert className="border-yellow-200 bg-yellow-50">
                    <Star className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <strong>💡 REMEMBER:</strong> Spring tides have NOTHING to do with the season!
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Factors Affecting Tidal Range:</h4>
                    <ol className="space-y-1 ml-4">
                      <li>1. Gravitational pull of Moon and Sun</li>
                      <li>2. Physical features of coastline</li>
                      <li>3. Shape of coastline</li>
                      <li>4. Environmental factors (wind, pressure)</li>
                    </ol>
                  </div>
                  
                  <Alert className="border-blue-200 bg-blue-50">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <h4 className="font-semibold text-blue-700 mb-3">📐 TIDAL RANGE CALCULATION PRACTICE</h4>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-sm font-medium mb-2">Example Data:</p>
                        <div className="text-sm space-y-1">
                          <p><strong>Date:</strong> 1 May</p>
                          <p><strong>High tide:</strong> 2.8m</p>
                          <p><strong>Low tide:</strong> 0.4m</p>
                          <p className="text-green-700"><strong>Tidal range = 2.8 - 0.4 = 2.4m</strong></p>
                        </div>
                      </div>
                      <p className="text-sm mt-2"><strong>Formula:</strong> Tidal Range = High Tide - Low Tide</p>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Ocean Currents */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('ocean-currents')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🌀 Ocean Currents
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('ocean-currents')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'ocean-currents')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('ocean-currents') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('ocean-currents') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Two Main Types:</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-blue-600 text-white">
                            <th className="border border-gray-300 p-2 text-left">Current Type</th>
                            <th className="border border-gray-300 p-2 text-left">Driven By</th>
                            <th className="border border-gray-300 p-2 text-left">Characteristics</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="even:bg-gray-50">
                            <td className="border border-gray-300 p-2"><strong>SURFACE</strong></td>
                            <td className="border border-gray-300 p-2"><strong>WIND</strong></td>
                            <td className="border border-gray-300 p-2">Top ~400m, forms gyres, Coriolis effect</td>
                          </tr>
                          <tr className="even:bg-gray-50">
                            <td className="border border-gray-300 p-2"><strong>DEEP</strong></td>
                            <td className="border border-gray-300 p-2"><strong>DENSITY</strong> (temp & salinity)</td>
                            <td className="border border-gray-300 p-2">Thermohaline circulation, global conveyor belt</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Alert className="border-purple-200 bg-purple-50">
                    <AlertDescription className="text-purple-800">
                      <h4 className="font-semibold mb-2">Coriolis Effect:</h4>
                      <ul className="space-y-1">
                        <li><strong>Northern Hemisphere:</strong> currents deflect RIGHT (clockwise gyres)</li>
                        <li><strong>Southern Hemisphere:</strong> currents deflect LEFT (counter-clockwise)</li>
                        <li>Caused by Earth's rotation</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <h4 className="font-semibold mb-2">Upwelling:</h4>
                      <ul className="space-y-1">
                        <li><strong>Cold, nutrient-rich</strong> water rises to surface</li>
                        <li>Increases productivity (more phytoplankton)</li>
                        <li>Important for fishing areas</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                  
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>🌊 EXAM FOCUS - Ocean Currents:</strong>
                      <ul className="list-disc list-inside mt-2 text-sm">
                        <li><strong>Surface currents:</strong> Driven by WIND, affected by Coriolis effect</li>
                        <li><strong>Deep currents:</strong> Driven by DENSITY (temperature + salinity)</li>
                        <li><strong>Global conveyor belt:</strong> Thermohaline circulation moves water globally</li>
                        <li><strong>Upwelling:</strong> Cold, nutrient-rich water rises to surface</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">How Currents Affect Climate:</h4>
                    <ul className="space-y-1 ml-4">
                      <li>Warm currents → warmer, wetter weather</li>
                      <li>Cold currents → cooler, drier weather</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* El Niño & La Niña */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('el-nino')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🌡️ El Niño vs La Niña
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('el-nino')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'el-nino')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('el-nino') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('el-nino') && (
              <CardContent>
                <div className="space-y-6">
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800">
                      <h4 className="font-semibold text-blue-700 mb-2">🌊 El Niño Southern Oscillation (ENSO)</h4>
                      <p className="text-sm">A climate pattern that affects weather and ocean conditions across the Pacific Ocean, alternating between El Niño, La Niña, and neutral conditions every 2-7 years.</p>
                    </AlertDescription>
                  </Alert>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-700">
                      <thead className="text-xs text-white uppercase bg-blue-600">
                        <tr>
                          <th scope="col" className="px-4 py-2">Condition</th>
                          <th scope="col" className="px-4 py-2">Trade Winds</th>
                          <th scope="col" className="px-4 py-2">Water Temperature (South America)</th>
                          <th scope="col" className="px-4 py-2">Upwelling</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white border-b">
                          <td className="px-4 py-2 font-medium text-blue-600"><strong>NORMAL</strong></td>
                          <td className="px-4 py-2">Strong (east→west)</td>
                          <td className="px-4 py-2">Cold water, good fishing</td>
                          <td className="px-4 py-2">YES - Active</td>
                        </tr>
                        <tr className="bg-red-50 border-b">
                          <td className="px-4 py-2 font-medium text-red-600"><strong>EL NIÑO</strong></td>
                          <td className="px-4 py-2"><strong className="text-red-600">Weaken/reverse</strong></td>
                          <td className="px-4 py-2"><strong className="text-red-600">WARM water accumulates</strong></td>
                          <td className="px-4 py-2"><strong className="text-red-600">STOPS/Reduced</strong></td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="px-4 py-2 font-medium text-blue-600"><strong>LA NIÑA</strong></td>
                          <td className="px-4 py-2"><strong className="text-blue-600">Strengthen</strong></td>
                          <td className="px-4 py-2"><strong className="text-blue-600">EXTRA COLD water</strong></td>
                          <td className="px-4 py-2"><strong className="text-blue-600">Enhanced/Increased</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <h4 className="font-semibold text-orange-700 mb-2">🎯 EXAM FOCUS - El Niño Impacts on Marine Ecosystems & Climate:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <h5 className="font-semibold text-orange-700 mb-2">Marine Ecosystem Impacts:</h5>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            <li><strong>Reduced fish populations:</strong> Warm water lacks nutrients, fish move to cooler areas</li>
                            <li><strong>Disrupted food chain:</strong> Less phytoplankton → fewer fish → impacts on seabirds and marine mammals</li>
                            <li><strong>Economic impact:</strong> Fishing industry suffers, especially in Peru and Ecuador</li>
                            <li><strong>Marine productivity decline:</strong> Reduced upwelling means less nutrient cycling in ocean ecosystems</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-semibold text-orange-700 mb-2">Climate Impacts:</h5>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            <li><strong>Increased rainfall:</strong> Western South America experiences flooding</li>
                            <li><strong>Droughts:</strong> Australia and Southeast Asia become drier</li>
                            <li><strong>Storm patterns:</strong> Changes in hurricane/typhoon activity</li>
                            <li><strong>Global temperature:</strong> El Niño years tend to be warmer globally</li>
                          </ul>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <h4 className="font-semibold text-green-700 mb-2">💡 EXAM TIP - Remember the Key Differences:</h4>
                      <div className="text-sm space-y-2">
                        <p><strong>El Niño:</strong> Warm water + Weak trade winds + NO upwelling = Poor fishing + Climate disruption</p>
                        <p><strong>La Niña:</strong> Cold water + Strong trade winds + Enhanced upwelling = Good fishing + More extreme weather</p>
                        <p><strong>Normal:</strong> Balanced conditions with regular upwelling and stable climate patterns</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Coastal Zones */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('coastal-zones')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🏖️ Coastal Zones
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('coastal-zones')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'coastal-zones')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('coastal-zones') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('coastal-zones') && (
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800">
                      <strong>Littoral (Intertidal) Zone:</strong>
                      <p>Area between <strong>highest high tide</strong> and <strong>lowest low tide</strong> marks</p>
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Types of Shorelines:</h4>
                    <ul className="space-y-2 ml-4">
                      <li><strong>Rocky:</strong> High energy, steep, resistant to erosion</li>
                      <li><strong>Sandy:</strong> Moderate energy, gradual slope, constantly moving</li>
                      <li><strong>Muddy:</strong> Low energy, flat, high turbidity</li>
                      <li><strong>Estuaries:</strong> Fresh + salt water mix, <strong>brackish</strong>, nursery areas</li>
                      <li><strong>Deltas:</strong> Triangular, formed at river mouths where sediment deposits</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Key Definitions */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('definitions')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  📚 Key Definitions for Exam
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('definitions')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'definitions')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('definitions') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('definitions') && (
              <CardContent>
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-600 pl-4">
                    <strong>Subduction Zone:</strong> Area where one tectonic plate slides beneath another at a convergent boundary
                  </div>
                  <div className="border-l-4 border-green-600 pl-4">
                    <strong>Paleomagnetic Stripes:</strong> Alternating magnetic patterns on the ocean floor that provide evidence for seafloor spreading and magnetic field reversals
                  </div>
                  <div className="border-l-4 border-purple-600 pl-4">
                    <strong>Tidal Range:</strong> The difference in height between high tide and low tide (calculated: High tide - Low tide)
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Interactive Exam Practice Section */}
        <Card className="mt-6 border-blue-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-600">📝 Interactive Exam Practice</CardTitle>
              <Button 
                onClick={shuffleQuestions}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Shuffle Questions
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Question {currentQuestionIndex + 1} of {shuffledQuestions.length}</span>
                <Badge variant="outline" className="capitalize">
                  {currentQuestion.type.replace('-', ' ')}
                </Badge>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-lg mb-4 text-blue-800">
                  {currentQuestion.question}
                </h4>

                {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <label key={index} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="answer"
                          value={option}
                          checked={userAnswer === option}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                          disabled={showAnswer}
                        />
                        <span className={`${showAnswer && option === currentQuestion.correctAnswer ? 'text-green-600 font-semibold' : ''} ${showAnswer && userAnswer === option && option !== currentQuestion.correctAnswer ? 'text-red-600' : ''}`}>
                          {String.fromCharCode(65 + index)}) {option}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {(currentQuestion.type === 'short-answer' || currentQuestion.type === 'calculation') && (
                  <div className="space-y-3">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full p-3 border border-gray-300 rounded-md resize-none"
                      rows={3}
                      disabled={showAnswer}
                    />
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  {!showAnswer ? (
                    <Button 
                      onClick={handleAnswerSubmit}
                      disabled={!userAnswer.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <Button 
                      onClick={nextQuestion}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Next Question
                    </Button>
                  )}
                </div>
              </div>

              {showAnswer && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {currentQuestion.type === 'multiple-choice' ? (
                          userAnswer === currentQuestion.correctAnswer ? (
                            <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                          ) : (
                            <Circle className="h-6 w-6 text-red-600 mt-0.5" />
                          )
                        ) : (
                          <BookOpen className="h-6 w-6 text-blue-600 mt-0.5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-800 mb-2">
                          {currentQuestion.type === 'multiple-choice' ? (
                            userAnswer === currentQuestion.correctAnswer ? 
                            'Correct! 🎉' : 'Not quite right 📚'
                          ) : (
                            'Here\'s the answer and explanation 📚'
                          )}
                        </h5>
                        <div className="space-y-2">
                          <p><strong>Correct Answer:</strong> {currentQuestion.correctAnswer}</p>
                          {currentQuestion.explanation && (
                            <p className="text-gray-600"><strong>Explanation:</strong> {currentQuestion.explanation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Final Tips */}
        <Card className="mt-6 border-green-300">
          <CardHeader>
            <CardTitle className="text-green-600">🎯 Last-Minute Exam Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>✓ For calculations: ALWAYS show your working</li>
              <li>✓ Know the difference between spring vs neap tides</li>
              <li>✓ Remember: Oceanic crust = basaltic and DENSER</li>
              <li>✓ Seafloor spreading supported plate tectonics, NOT Wegener's original theory</li>
              <li>✓ Convergent boundaries = trenches (not divergent!)</li>
              <li>✓ El Niño = warm water at South America, upwelling STOPS</li>
              <li>✓ Global conveyor belt driven by density (temperature + salinity)</li>
              <li>✓ Ice erosion is associated with glaciers</li>
              <li>✓ Littoral zone = area between highest and lowest tide marks</li>
              <li>✓ Upwelling = cold, nutrient-rich water rises to surface</li>
              <li>✓ Coriolis effect: Northern Hemisphere deflects RIGHT</li>
              <li>✓ Surface currents = WIND driven, Deep currents = DENSITY driven</li>
            </ul>
          </CardContent>
        </Card>

        {/* Study Checklist */}
        <Card className="mt-6 border-blue-300">
          <CardHeader>
            <CardTitle className="text-blue-600">📋 Final Study Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('earth-layers')}>
                  {checklistItems['earth-layers'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['earth-layers'] ? 'line-through text-gray-500' : ''}>Label Earth's layers (crust, mantle, core)</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('crust-difference')}>
                  {checklistItems['crust-difference'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['crust-difference'] ? 'line-through text-gray-500' : ''}>Explain difference between oceanic and continental crust</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('plate-boundaries')}>
                  {checklistItems['plate-boundaries'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['plate-boundaries'] ? 'line-through text-gray-500' : ''}>List THREE types of plate boundaries and their features</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('plate-evidence')}>
                  {checklistItems['plate-evidence'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['plate-evidence'] ? 'line-through text-gray-500' : ''}>Provide evidence for plate tectonics</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('subduction-zone')}>
                  {checklistItems['subduction-zone'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['subduction-zone'] ? 'line-through text-gray-500' : ''}>Define subduction zone</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('weathering-types')}>
                  {checklistItems['weathering-types'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['weathering-types'] ? 'line-through text-gray-500' : ''}>Name THREE types of weathering</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('weathering-erosion-diff')}>
                  {checklistItems['weathering-erosion-diff'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['weathering-erosion-diff'] ? 'line-through text-gray-500' : ''}>Explain difference between weathering and erosion</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('tidal-range-calc')}>
                  {checklistItems['tidal-range-calc'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['tidal-range-calc'] ? 'line-through text-gray-500' : ''}>Calculate tidal range (High tide - Low tide)</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('spring-neap-tides')}>
                  {checklistItems['spring-neap-tides'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['spring-neap-tides'] ? 'line-through text-gray-500' : ''}>Explain difference between spring and neap tides</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('coriolis-effect')}>
                  {checklistItems['coriolis-effect'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['coriolis-effect'] ? 'line-through text-gray-500' : ''}>Describe Coriolis effect</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('surface-deep-currents')}>
                  {checklistItems['surface-deep-currents'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['surface-deep-currents'] ? 'line-through text-gray-500' : ''}>Compare surface currents vs deep currents</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('upwelling')}>
                  {checklistItems['upwelling'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['upwelling'] ? 'line-through text-gray-500' : ''}>Define upwelling and explain its importance</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('el-nino-conditions')}>
                  {checklistItems['el-nino-conditions'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['el-nino-conditions'] ? 'line-through text-gray-500' : ''}>Describe El Niño conditions</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('littoral-zone')}>
                  {checklistItems['littoral-zone'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['littoral-zone'] ? 'line-through text-gray-500' : ''}>Define littoral zone</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <Button 
          onClick={printGuide}
          className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
          size="lg"
        >
          <Download className="h-4 w-4 mr-2" />
          Print Guide
        </Button>
        <Button 
          onClick={shareGuide}
          variant="outline"
          className="bg-white hover:bg-gray-50 shadow-lg"
          size="lg"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  )
}
