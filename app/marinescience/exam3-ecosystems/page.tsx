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

export default function MarineScienceChapter3StudyGuide() {
  const [studyItems, setStudyItems] = useState<StudyItem[]>([
    { id: "symbiotic-relationships", completed: false },
    { id: "photosynthesis", completed: false },
    { id: "autotrophs-heterotrophs", completed: false },
    { id: "photic-zone", completed: false },
    { id: "energy-transfer", completed: false },
    { id: "food-webs", completed: false },
    { id: "nutrient-cycles", completed: false },
    { id: "carbon-cycle", completed: false },
    { id: "pyramids", completed: false },
    { id: "definitions", completed: false }
  ])

  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({
    'symbiotic-examples': false,
    'photosynthesis-equation': false,
    'autotroph-heterotroph': false,
    'photic-zone-explain': false,
    'compensation-point': false,
    'chemosynthesis': false,
    'energy-calculations': false,
    'trophic-levels': false,
    'food-web-draw': false,
    'biotic-abiotic': false,
    'upwelling': false,
    'inverted-pyramid': false,
    'marine-snow': false,
    'ocean-acidification': false,
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
      question: 'In a mutualistic relationship, what is the effect on both organisms?',
      options: [
        'Both organisms benefit',
        'One benefits, one is harmed',
        'One benefits, one is unaffected',
        'Both organisms are harmed'
      ],
      correctAnswer: 'Both organisms benefit',
      explanation: 'Mutualism is a symbiotic relationship where BOTH organisms benefit. Examples include clownfish and sea anemones, or coral and zooxanthellae.'
    },
    {
      id: 'q2',
      type: 'short-answer',
      question: 'State the word equation for photosynthesis.',
      correctAnswer: 'Carbon dioxide + Water → Glucose + Oxygen (in the presence of light)',
      explanation: 'Photosynthesis converts carbon dioxide and water into glucose and oxygen using light energy. The full equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂'
    },
    {
      id: 'q3',
      type: 'calculation',
      question: 'If producers have 10,000 kJ of energy, and 10% is transferred to primary consumers, how much energy do primary consumers receive?',
      correctAnswer: '1,000 kJ',
      explanation: 'Energy transfer between trophic levels is typically 10%. Calculation: 10,000 kJ × 0.10 = 1,000 kJ'
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      question: 'Which process occurs at hydrothermal vents in the deep ocean?',
      options: [
        'Photosynthesis',
        'Chemosynthesis',
        'Respiration only',
        'Decomposition only'
      ],
      correctAnswer: 'Chemosynthesis',
      explanation: 'Chemosynthesis occurs at hydrothermal vents where bacteria use chemicals like hydrogen sulfide to produce energy, forming the base of the food chain in the absence of sunlight.'
    },
    {
      id: 'q5',
      type: 'short-answer',
      question: 'Define the compensation point in marine environments.',
      correctAnswer: 'The depth where photosynthesis equals respiration; where light intensity is just sufficient for net photosynthesis to be zero',
      explanation: 'Above the compensation point, photosynthesis exceeds respiration. Below it, respiration exceeds photosynthesis, so producers cannot survive long-term.'
    },
    {
      id: 'q6',
      type: 'multiple-choice',
      question: 'Approximately what percentage of energy is transferred between trophic levels?',
      options: [
        '50%',
        '25%',
        '10%',
        '90%'
      ],
      correctAnswer: '10%',
      explanation: 'Only about 10% of energy is transferred between trophic levels. The remaining 90% is lost as heat, movement, excretion, and undigested material.'
    },
    {
      id: 'q7',
      type: 'short-answer',
      question: 'Explain why biomass pyramids can appear inverted in marine ecosystems.',
      correctAnswer: 'Phytoplankton (producers) have rapid reproduction rates and are consumed quickly, so their biomass at any moment is less than zooplankton, even though energy flow is normal',
      explanation: 'This is due to high turnover rates. Phytoplankton reproduce very fast but are eaten immediately, maintaining small standing biomass despite high productivity.'
    },
    {
      id: 'q8',
      type: 'multiple-choice',
      question: 'What is marine snow?',
      options: [
        'Frozen seawater crystals',
        'White coral bleaching',
        'Dead organic matter falling through the water column',
        'Salt precipitation'
      ],
      correctAnswer: 'Dead organic matter falling through the water column',
      explanation: 'Marine snow consists of dead plankton, fecal matter, and organic debris that sinks from surface waters, transporting carbon to the deep ocean.'
    },
    {
      id: 'q9',
      type: 'short-answer',
      question: 'Name TWO factors that limit photosynthesis in marine environments.',
      correctAnswer: '1) Light intensity/depth, 2) Nutrient availability (nitrogen, phosphorus)',
      explanation: 'Light decreases with depth, limiting photosynthesis below the photic zone. Nutrients like nitrogen and phosphorus are often limiting factors in surface waters.'
    },
    {
      id: 'q10',
      type: 'calculation',
      question: 'Calculate the percentage of energy transferred from producers (87,500 kJ) to primary consumers (8,420 kJ). Show your working.',
      correctAnswer: '9.6%',
      explanation: 'Calculation: (8,420 ÷ 87,500) × 100 = 9.62% ≈ 9.6%. This is close to the typical 10% energy transfer rule.'
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
          title: 'AICE Marine Science - Interactions in Marine Ecosystems Study Guide',
          text: 'Check out this comprehensive study guide for AICE Marine Science Chapter 3!',
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
        <div className="container mx-auto px-4 py-4 md:py-8">
          {/* Mobile: Stack vertically, Desktop: Absolute positioning */}
          <div className="flex flex-col items-center gap-4 md:relative">
            {/* Logo */}
            <div className="md:absolute md:top-1/2 md:-translate-y-1/2 md:left-0">
              <Link href="/" className="block transition-all duration-200 hover:scale-105">
                <Image
                  src="/images/casanova-study-logo.png"
                  alt="Casanova Study"
                  width={312}
                  height={117}
                  className="h-16 w-28 sm:h-20 sm:w-32 md:h-24 md:w-40 lg:h-32 lg:w-52 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer"
                />
              </Link>
            </div>

            {/* Centered content */}
            <div className="text-center w-full">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                AICE Marine Science
              </h1>
              <h2 className="text-base sm:text-lg md:text-xl opacity-90">Chapter 3: Interactions in Marine Ecosystems - Study Guide</h2>
              <p className="mt-2 md:mt-4 text-xs sm:text-sm opacity-75">Interactive study guide with progress tracking</p>
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
                    Congratulations! You've completed all sections. You're ready for the exam!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exam Format */}
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">📝 Exam Format (80 marks total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Section A: Short Answer</span>
                  <Badge variant="outline">20 marks</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Section B: Structured Questions</span>
                  <Badge variant="outline">40 marks</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Section C: Extended Response</span>
                  <Badge variant="outline">20 marks</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Study Sections */}
        <div className="space-y-4">
          {/* Symbiotic Relationships */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('symbiotic-relationships')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🤝 Symbiotic Relationships
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('symbiotic-relationships')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'symbiotic-relationships')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('symbiotic-relationships') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('symbiotic-relationships') && (
              <CardContent>
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="border border-gray-300 p-2 text-left">Relationship</th>
                          <th className="border border-gray-300 p-2 text-left">Effect on Host</th>
                          <th className="border border-gray-300 p-2 text-left">Effect on Symbiont</th>
                          <th className="border border-gray-300 p-2 text-left">Marine Example</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong className="text-green-600">MUTUALISM</strong></td>
                          <td className="border border-gray-300 p-2"><strong>BENEFITS</strong> (+)</td>
                          <td className="border border-gray-300 p-2"><strong>BENEFITS</strong> (+)</td>
                          <td className="border border-gray-300 p-2">Clownfish & sea anemone, Coral & zooxanthellae</td>
                        </tr>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong className="text-red-600">PARASITISM</strong></td>
                          <td className="border border-gray-300 p-2"><strong>HARMED</strong> (-)</td>
                          <td className="border border-gray-300 p-2"><strong>BENEFITS</strong> (+)</td>
                          <td className="border border-gray-300 p-2">Tapeworms in fish, Sea lice on salmon</td>
                        </tr>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong className="text-blue-600">COMMENSALISM</strong></td>
                          <td className="border border-gray-300 p-2"><strong>UNAFFECTED</strong> (0)</td>
                          <td className="border border-gray-300 p-2"><strong>BENEFITS</strong> (+)</td>
                          <td className="border border-gray-300 p-2">Remora & shark, Barnacles on whales</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <Alert className="border-green-200 bg-green-50">
                    <Star className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>💡 EXAM TIP:</strong> Remember the symbols: Mutualism (+/+), Parasitism (-/+), Commensalism (0/+)
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Key Examples to Know:</h4>
                    <ul className="space-y-2 ml-4">
                      <li><strong>Clownfish & Sea Anemone (Mutualism):</strong> Clownfish gets protection, anemone gets food scraps & defense</li>
                      <li><strong>Coral & Zooxanthellae (Mutualism):</strong> Algae provides food via photosynthesis, coral provides shelter</li>
                      <li><strong>Remora & Shark (Commensalism):</strong> Remora gets free rides & food scraps, shark unaffected</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Photosynthesis & Chemosynthesis */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('photosynthesis')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  ☀️ Photosynthesis & Chemosynthesis
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('photosynthesis')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'photosynthesis')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('photosynthesis') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('photosynthesis') && (
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800">
                      <h4 className="font-semibold mb-2">📖 Photosynthesis Equations:</h4>
                      <div className="space-y-2">
                        <div className="bg-white p-3 rounded border">
                          <p className="font-semibold text-blue-700">Word Equation:</p>
                          <p className="text-sm">Carbon dioxide + Water → Glucose + Oxygen (in presence of light)</p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="font-semibold text-blue-700">Chemical Equation:</p>
                          <p className="text-sm">6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Factors Limiting Photosynthesis in Marine Environments:</h4>
                    <ol className="space-y-2 ml-4">
                      <li><strong>1. Light intensity:</strong> Decreases with depth, limits photosynthesis below photic zone</li>
                      <li><strong>2. Nutrient availability:</strong> Nitrogen, phosphorus, iron often limiting in surface waters</li>
                      <li><strong>3. Temperature:</strong> Affects enzyme activity</li>
                      <li><strong>4. CO₂ availability:</strong> Can be limiting in some environments</li>
                    </ol>
                  </div>

                  <Alert className="border-purple-200 bg-purple-50">
                    <AlertDescription className="text-purple-800">
                      <h4 className="font-semibold mb-2">🔥 Chemosynthesis:</h4>
                      <ul className="space-y-1 text-sm">
                        <li><strong>Location:</strong> Hydrothermal vents, deep ocean floor</li>
                        <li><strong>Process:</strong> Bacteria use chemicals (H₂S, CH₄) instead of sunlight for energy</li>
                        <li><strong>Importance:</strong> Forms base of food chain in dark environments where photosynthesis is impossible</li>
                        <li><strong>Example:</strong> Tube worms at hydrothermal vents rely on chemosynthetic bacteria</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>🔥 CRITICAL EXAM POINT:</strong> Know BOTH equations for photosynthesis (word AND chemical)!
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Autotrophs vs Heterotrophs */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('autotrophs-heterotrophs')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🌱 Autotrophs vs Heterotrophs
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('autotrophs-heterotrophs')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'autotrophs-heterotrophs')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('autotrophs-heterotrophs') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('autotrophs-heterotrophs') && (
              <CardContent>
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="border border-gray-300 p-2 text-left">Type</th>
                          <th className="border border-gray-300 p-2 text-left">Definition</th>
                          <th className="border border-gray-300 p-2 text-left">Examples</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong className="text-green-600">AUTOTROPH</strong></td>
                          <td className="border border-gray-300 p-2">Organisms that <strong>make their own food</strong> from inorganic substances</td>
                          <td className="border border-gray-300 p-2">Phytoplankton, seaweed, seagrass, photosynthetic bacteria</td>
                        </tr>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong className="text-blue-600">HETEROTROPH</strong></td>
                          <td className="border border-gray-300 p-2">Organisms that <strong>consume other organisms</strong> for food</td>
                          <td className="border border-gray-300 p-2">Zooplankton, fish, sharks, marine mammals, crustaceans</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <Alert className="border-yellow-200 bg-yellow-50">
                    <Star className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <strong>💡 REMEMBER:</strong> Auto = self, Hetero = other. Autotrophs are PRODUCERS, heterotrophs are CONSUMERS.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Photic Zone & Primary Productivity */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('photic-zone')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  💡 Photic Zone & Primary Productivity
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('photic-zone')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'photic-zone')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('photic-zone') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('photic-zone') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Key Definitions:</h4>
                    <div className="space-y-3">
                      <div className="border-l-4 border-blue-600 pl-4">
                        <strong>Primary Productivity:</strong> The rate at which producers (autotrophs) convert light energy into chemical energy through photosynthesis
                      </div>
                      <div className="border-l-4 border-green-600 pl-4">
                        <strong>Photic Zone:</strong> Upper layer of ocean where sufficient light penetrates for photosynthesis (0-200m typically)
                      </div>
                      <div className="border-l-4 border-purple-600 pl-4">
                        <strong>Compensation Point:</strong> The depth where photosynthesis equals respiration; net productivity is zero
                      </div>
                      <div className="border-l-4 border-orange-600 pl-4">
                        <strong>Thermocline:</strong> Layer where temperature changes rapidly with depth, separates warm surface water from cold deep water
                      </div>
                      <div className="border-l-4 border-red-600 pl-4">
                        <strong>Trophic Level:</strong> Position an organism occupies in a food chain (producer, primary consumer, secondary consumer, etc.)
                      </div>
                    </div>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800">
                      <h4 className="font-semibold mb-2">🎯 Why 90% of Marine Life is in the Photic Zone:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• <strong>Light for photosynthesis:</strong> Producers need light to make food</li>
                        <li>• <strong>Above compensation point:</strong> Net photosynthesis is positive, supporting food webs</li>
                        <li>• <strong>Thermocline concentrates nutrients:</strong> Warmer surface waters hold more life</li>
                        <li>• <strong>Primary productivity is highest:</strong> More food = more organisms at all trophic levels</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>🔥 EXAM FOCUS:</strong> Your answer MUST reference both compensation point AND thermocline when explaining photic zone importance!
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Energy Transfer & Trophic Levels */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('energy-transfer')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  ⚡ Energy Transfer & Trophic Levels
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('energy-transfer')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'energy-transfer')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('energy-transfer') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('energy-transfer') && (
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-600 text-white p-4 rounded-lg text-center">
                    <div className="text-xl font-bold">ONLY ~10% OF ENERGY TRANSFERS BETWEEN TROPHIC LEVELS</div>
                    <div className="text-sm mt-2">90% is lost at each level!</div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Three Ways Energy is Lost Between Trophic Levels:</h4>
                    <ol className="space-y-2 ml-4">
                      <li><strong>1. Heat from respiration:</strong> Energy used for movement, maintaining body temperature</li>
                      <li><strong>2. Excretion:</strong> Waste products (urine, feces) contain energy that's not absorbed</li>
                      <li><strong>3. Undigested material:</strong> Not all consumed material can be digested and absorbed</li>
                    </ol>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <h4 className="font-semibold text-blue-700 mb-3">📐 ENERGY TRANSFER CALCULATION PRACTICE</h4>
                      <div className="bg-white p-3 rounded border space-y-2">
                        <p className="text-sm font-medium">Example:</p>
                        <p className="text-sm">Producers: 87,500 kJ m⁻² yr⁻¹</p>
                        <p className="text-sm">Primary consumers: 8,420 kJ m⁻² yr⁻¹</p>
                        <p className="text-sm mt-2"><strong>Calculation:</strong> (8,420 ÷ 87,500) × 100 = <span className="text-green-700 font-semibold">9.6%</span></p>
                      </div>
                      <p className="text-sm mt-2"><strong>Formula:</strong> (Energy at next level ÷ Energy at current level) × 100</p>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <h4 className="font-semibold mb-2">Why Food Chains Rarely Have More Than 5 Trophic Levels:</h4>
                      <p className="text-sm">With only 10% energy transfer, there's insufficient energy to support higher levels. Example: 10,000 kJ → 1,000 kJ → 100 kJ → 10 kJ → 1 kJ (not enough to sustain organisms)</p>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Food Webs */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('food-webs')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🕸️ Food Webs & Ecosystem Stability
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('food-webs')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'food-webs')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('food-webs') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('food-webs') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Structure of Marine Food Webs:</h4>
                    <ul className="space-y-2 ml-4">
                      <li><strong>Producers:</strong> Phytoplankton, seaweed, seagrass (make their own food)</li>
                      <li><strong>Primary Consumers:</strong> Zooplankton, herbivorous fish, sea urchins (eat producers)</li>
                      <li><strong>Secondary Consumers:</strong> Small carnivorous fish, jellyfish (eat primary consumers)</li>
                      <li><strong>Tertiary Consumers/Top Predators:</strong> Sharks, orcas, large fish (eat secondary consumers)</li>
                      <li><strong>Decomposers:</strong> Bacteria, fungi (break down dead organic matter, recycle nutrients)</li>
                    </ul>
                  </div>

                  <Alert className="border-purple-200 bg-purple-50">
                    <AlertDescription className="text-purple-800">
                      <h4 className="font-semibold mb-2">Food Webs vs Food Chains:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• <strong>Food chains:</strong> Show single linear pathway (A → B → C → D)</li>
                        <li>• <strong>Food webs:</strong> Show multiple interconnected pathways (more realistic)</li>
                        <li>• <strong>Why webs are better:</strong> Most organisms eat multiple food sources and are eaten by multiple predators</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <h4 className="font-semibold mb-2">🎯 Keystone Predators & Trophic Cascades:</h4>
                      <p className="text-sm mb-2"><strong>Keystone predator:</strong> Species that has disproportionately large effect on ecosystem (e.g., sea stars, sharks)</p>
                      <p className="text-sm mb-2"><strong>Trophic cascade:</strong> When removal of top predator causes chain reaction through all trophic levels</p>
                      <p className="text-sm"><strong>Example:</strong> Remove sharks → mid-level predators increase → herbivores decrease → algae/producers increase → ecosystem imbalance</p>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Nutrient Cycles */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('nutrient-cycles')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  ♻️ Nutrient Cycles
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('nutrient-cycles')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'nutrient-cycles')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('nutrient-cycles') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('nutrient-cycles') && (
              <CardContent>
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="border border-gray-300 p-2 text-left">Phase</th>
                          <th className="border border-gray-300 p-2 text-left">Description</th>
                          <th className="border border-gray-300 p-2 text-left">Examples</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong className="text-green-600">BIOTIC PHASE</strong></td>
                          <td className="border border-gray-300 p-2">Nutrients in <strong>living organisms</strong></td>
                          <td className="border border-gray-300 p-2">Nitrogen in fish tissues, Carbon in plankton</td>
                        </tr>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong className="text-blue-600">ABIOTIC PHASE</strong></td>
                          <td className="border border-gray-300 p-2">Nutrients in <strong>non-living reservoirs</strong></td>
                          <td className="border border-gray-300 p-2">Dissolved nutrients in water, sediments, atmosphere</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Five Abiotic Processes that Replenish Surface Nutrients:</h4>
                    <ol className="space-y-2 ml-4">
                      <li><strong>1. Upwelling:</strong> Deep, nutrient-rich water rises to surface</li>
                      <li><strong>2. River runoff:</strong> Brings nutrients from land</li>
                      <li><strong>3. Atmospheric deposition:</strong> Nutrients fall from air (dust, rain)</li>
                      <li><strong>4. Vertical mixing:</strong> Storm/wind mixing brings deep water up</li>
                      <li><strong>5. Tidal mixing:</strong> Tides stir up nutrients from bottom</li>
                    </ol>
                  </div>

                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <h4 className="font-semibold mb-2">🌊 How Upwelling Increases Productivity:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Wind blows surface water offshore (due to Coriolis effect)</li>
                        <li>• Deep, cold, <strong>nutrient-rich water</strong> rises to replace it</li>
                        <li>• More nutrients → More phytoplankton → More productivity</li>
                        <li>• Creates highly productive fishing areas (e.g., Peru, California coast)</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertDescription className="text-orange-800">
                      <h4 className="font-semibold mb-2">📉 Sedimentation & Long-term Nutrient Storage:</h4>
                      <p className="text-sm">Dead organisms and waste sink to ocean floor, nutrients become trapped in sediments for millions of years, eventually forming rocks and fossil fuels. This removes nutrients from short-term cycling.</p>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Marine Carbon Cycle */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('carbon-cycle')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🌍 Marine Carbon Cycle
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('carbon-cycle')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'carbon-cycle')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('carbon-cycle') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('carbon-cycle') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">How CO₂ Enters the Ocean:</h4>
                    <ol className="space-y-2 ml-4">
                      <li><strong>1. Diffusion:</strong> CO₂ dissolves directly from atmosphere into surface water</li>
                      <li><strong>2. Photosynthesis:</strong> Phytoplankton absorb dissolved CO₂ to make organic compounds</li>
                    </ol>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800">
                      <h4 className="font-semibold mb-2">❄️ Marine Snow:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• <strong>Definition:</strong> Dead organisms, fecal pellets, and organic debris falling through water column</li>
                        <li>• <strong>Appearance:</strong> Looks like snow falling underwater</li>
                        <li>• <strong>Role in carbon cycle:</strong> Transports carbon from surface to deep ocean/seafloor</li>
                        <li>• <strong>Long-term storage:</strong> Carbon gets buried in sediments, removed from cycle for millions of years</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <h4 className="font-semibold mb-2">🔥 CRITICAL: Ocean Acidification</h4>
                      <div className="text-sm space-y-2">
                        <p><strong>Process:</strong></p>
                        <ul className="list-disc list-inside ml-2">
                          <li>Increased atmospheric CO₂ dissolves in ocean</li>
                          <li>Forms carbonic acid (H₂CO₃), lowering pH</li>
                          <li>Reduces carbonate ions (CO₃²⁻) availability</li>
                        </ul>
                        <p className="mt-2"><strong>Effects on marine organisms with CaCO₃ shells/skeletons:</strong></p>
                        <ul className="list-disc list-inside ml-2">
                          <li>Harder to build shells/skeletons (corals, mollusks, plankton)</li>
                          <li>Existing shells can dissolve</li>
                          <li>Reduced survival, especially for larvae</li>
                          <li>Impacts entire food web (many organisms have CaCO₃ structures)</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-purple-200 bg-purple-50">
                    <AlertDescription className="text-purple-800">
                      <h4 className="font-semibold mb-2">Long-term Carbon Storage:</h4>
                      <p className="text-sm">Sedimentation and fossilization bury carbon in seafloor sediments → forms limestone, fossil fuels over millions of years → removes carbon from active cycling</p>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Pyramids */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('pyramids')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  📊 Ecological Pyramids
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('pyramids')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'pyramids')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('pyramids') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('pyramids') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Pyramid of Biomass:</h4>
                    <p className="text-sm mb-3"><strong>Definition:</strong> Shows the total mass of organisms at each trophic level at a specific time</p>
                  </div>

                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertDescription className="text-orange-800">
                      <h4 className="font-semibold mb-2">🔄 Why Biomass Pyramids Can Be INVERTED in Marine Ecosystems:</h4>
                      <div className="text-sm space-y-2">
                        <p><strong>Reason 1: High turnover rates</strong></p>
                        <ul className="list-disc list-inside ml-2">
                          <li>Phytoplankton reproduce VERY fast but are eaten immediately</li>
                          <li>Small standing biomass but high productivity</li>
                          <li>Like a small bakery making lots of bread - small stock, high production</li>
                        </ul>
                        <p className="mt-2"><strong>Reason 2: Size difference</strong></p>
                        <ul className="list-disc list-inside ml-2">
                          <li>Tiny producers (phytoplankton) vs larger consumers (zooplankton, fish)</li>
                          <li>At any moment, consumer biomass can exceed producer biomass</li>
                          <li>But energy flow still follows 10% rule</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <h4 className="font-semibold mb-2">⚡ Why Energy Pyramids Are NEVER Inverted:</h4>
                      <p className="text-sm">Energy pyramids show energy FLOW (rate), not standing stock. The 2nd law of thermodynamics means energy is always lost as heat at each transfer. You cannot have more energy at a higher level than the level below - it would violate physics!</p>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-blue-200 bg-blue-50">
                    <Star className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>💡 EXAM TIP:</strong> Biomass pyramids can be inverted (snapshot in time), but energy pyramids NEVER can (rate/flow must decrease)
                    </AlertDescription>
                  </Alert>
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
                    <strong>Primary Productivity:</strong> The rate at which producers convert light energy into chemical energy through photosynthesis
                  </div>
                  <div className="border-l-4 border-green-600 pl-4">
                    <strong>Trophic Level:</strong> The position an organism occupies in a food chain (1st = producers, 2nd = primary consumers, etc.)
                  </div>
                  <div className="border-l-4 border-purple-600 pl-4">
                    <strong>Compensation Point:</strong> The depth where photosynthesis rate equals respiration rate; net productivity is zero
                  </div>
                  <div className="border-l-4 border-orange-600 pl-4">
                    <strong>Marine Snow:</strong> Dead organic matter (organisms, feces, debris) that falls through the water column like snow
                  </div>
                  <div className="border-l-4 border-red-600 pl-4">
                    <strong>Eutrophication:</strong> Excessive nutrient enrichment (often from pollution) causing algal blooms and oxygen depletion (dead zones)
                  </div>
                  <div className="border-l-4 border-pink-600 pl-4">
                    <strong>Keystone Species:</strong> A species that has disproportionately large effect on ecosystem relative to its abundance
                  </div>
                  <div className="border-l-4 border-teal-600 pl-4">
                    <strong>Trophic Cascade:</strong> Chain reaction through food web when top predator is removed, affecting all trophic levels below
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
                            'Correct!' : 'Not quite right'
                          ) : (
                            'Here\'s the answer and explanation'
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
              <li>✓ Know ALL THREE symbiotic relationships with marine examples</li>
              <li>✓ Memorize photosynthesis equations (word AND chemical)</li>
              <li>✓ Remember: Only ~10% energy transfers between trophic levels</li>
              <li>✓ Compensation point = photosynthesis equals respiration</li>
              <li>✓ Chemosynthesis occurs at hydrothermal vents (no sunlight needed)</li>
              <li>✓ Autotroph = makes own food, Heterotroph = consumes others</li>
              <li>✓ For energy calculations, ALWAYS show your working!</li>
              <li>✓ Biomass pyramids CAN be inverted (high turnover), energy pyramids CANNOT</li>
              <li>✓ Marine snow = dead organic matter falling through water</li>
              <li>✓ Ocean acidification threatens organisms with CaCO₃ shells</li>
              <li>✓ Upwelling brings nutrient-rich deep water to surface</li>
              <li>✓ Biotic phase = living organisms, Abiotic phase = non-living reservoirs</li>
              <li>✓ Keystone predator removal causes trophic cascade</li>
              <li>✓ 90% of marine life in photic zone (light + nutrients)</li>
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
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('symbiotic-examples')}>
                  {checklistItems['symbiotic-examples'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['symbiotic-examples'] ? 'line-through text-gray-500' : ''}>Give examples of mutualism, parasitism, commensalism</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('photosynthesis-equation')}>
                  {checklistItems['photosynthesis-equation'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['photosynthesis-equation'] ? 'line-through text-gray-500' : ''}>Write photosynthesis equation (word and chemical)</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('autotroph-heterotroph')}>
                  {checklistItems['autotroph-heterotroph'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['autotroph-heterotroph'] ? 'line-through text-gray-500' : ''}>Distinguish autotroph from heterotroph</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('photic-zone-explain')}>
                  {checklistItems['photic-zone-explain'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['photic-zone-explain'] ? 'line-through text-gray-500' : ''}>Explain why 90% of marine life is in photic zone</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('compensation-point')}>
                  {checklistItems['compensation-point'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['compensation-point'] ? 'line-through text-gray-500' : ''}>Define compensation point</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('chemosynthesis')}>
                  {checklistItems['chemosynthesis'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['chemosynthesis'] ? 'line-through text-gray-500' : ''}>Explain where chemosynthesis occurs and why it's important</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('energy-calculations')}>
                  {checklistItems['energy-calculations'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['energy-calculations'] ? 'line-through text-gray-500' : ''}>Calculate energy transfer percentages</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('trophic-levels')}>
                  {checklistItems['trophic-levels'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['trophic-levels'] ? 'line-through text-gray-500' : ''}>Explain why food chains rarely exceed 5 trophic levels</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('food-web-draw')}>
                  {checklistItems['food-web-draw'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['food-web-draw'] ? 'line-through text-gray-500' : ''}>Draw a marine food web with 6+ organisms</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('biotic-abiotic')}>
                  {checklistItems['biotic-abiotic'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['biotic-abiotic'] ? 'line-through text-gray-500' : ''}>Explain biotic vs abiotic phases of nutrient cycles</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('upwelling')}>
                  {checklistItems['upwelling'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['upwelling'] ? 'line-through text-gray-500' : ''}>Explain how upwelling increases productivity</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('inverted-pyramid')}>
                  {checklistItems['inverted-pyramid'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['inverted-pyramid'] ? 'line-through text-gray-500' : ''}>Explain why biomass pyramids can be inverted</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('marine-snow')}>
                  {checklistItems['marine-snow'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['marine-snow'] ? 'line-through text-gray-500' : ''}>Define marine snow and its role in carbon cycle</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('ocean-acidification')}>
                  {checklistItems['ocean-acidification'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['ocean-acidification'] ? 'line-through text-gray-500' : ''}>Explain ocean acidification effects on CaCO₃ organisms</span>
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
