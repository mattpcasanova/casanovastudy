"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, BookOpen, Download, Share2, Star, CheckCircle, Circle, AlertTriangle, Calculator, RefreshCw, BookmarkPlus, Loader2, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"

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

export default function MarineScienceChapter4StudyGuide() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [studyItems, setStudyItems] = useState<StudyItem[]>([
    { id: "classification", completed: false },
    { id: "plankton", completed: false },
    { id: "echinoderms", completed: false },
    { id: "crustaceans", completed: false },
    { id: "bony-fish", completed: false },
    { id: "cartilaginous-fish", completed: false },
    { id: "macroalgae", completed: false },
    { id: "marine-plants", completed: false },
    { id: "biodiversity", completed: false },
    { id: "populations-sampling", completed: false },
    { id: "simpsons-index", completed: false },
    { id: "spearmans-rank", completed: false },
    { id: "definitions", completed: false }
  ])

  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({
    'taxonomic-hierarchy': false,
    'binomial-nomenclature': false,
    'dichotomous-key': false,
    'phytoplankton-zooplankton': false,
    'echinoderm-features': false,
    'crustacean-features': false,
    'bony-fish-features': false,
    'cartilaginous-fish-features': false,
    'macroalgae-structure': false,
    'seagrass-adaptations': false,
    'keystone-species': false,
    'biodiversity-types': false,
    'lincoln-index': false,
    'simpsons-calculation': false,
    'spearmans-calculation': false,
    'sampling-methods': false,
    'biotic-abiotic': false,
    'ecological-economic': false,
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
      question: 'What is the correct order of the taxonomic hierarchy from largest to smallest?',
      options: [
        'Domain, Kingdom, Phylum, Class, Order, Family, Genus, Species',
        'Kingdom, Domain, Phylum, Class, Order, Family, Genus, Species',
        'Domain, Kingdom, Class, Phylum, Order, Family, Genus, Species',
        'Domain, Kingdom, Phylum, Order, Class, Family, Genus, Species'
      ],
      correctAnswer: 'Domain, Kingdom, Phylum, Class, Order, Family, Genus, Species',
      explanation: 'The taxonomic hierarchy from largest to smallest is: Domain, Kingdom, Phylum, Class, Order, Family, Genus, Species. Remember: "Dear King Philip Came Over For Good Spaghetti"'
    },
    {
      id: 'q2',
      type: 'short-answer',
      question: 'State TWO characteristics of echinoderms.',
      correctAnswer: 'Pentaradial symmetry (5 arms radiating from central body) and tube feet (water-filled tubes for locomotion, feeding, and respiration)',
      explanation: 'Echinoderms also have a calcium carbonate skeleton covered by thin skin, and include seastars, sea urchins, sea cucumbers, brittle stars, and sea lilies.'
    },
    {
      id: 'q3',
      type: 'calculation',
      question: 'A biologist captures 20 turtles and marks them. Two weeks later, 25 turtles are captured, 5 of which are marked. Using the Lincoln index, estimate the population size.',
      correctAnswer: '100 turtles',
      explanation: 'Lincoln index: N = (n₁ × n₂) / m₂ = (20 × 25) / 5 = 500 / 5 = 100 turtles'
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      question: 'What is a keystone species?',
      options: [
        'The most abundant species in an ecosystem',
        'An organism that plays a unique and crucial role disproportionate to its abundance',
        'The largest predator in a food web',
        'A species that is endemic to one location'
      ],
      correctAnswer: 'An organism that plays a unique and crucial role disproportionate to its abundance',
      explanation: 'Keystone species affect biodiversity more than expected from their population numbers. Without them, the ecosystem would be dramatically different or cease to exist. Examples include sea otters in kelp forests and COTS on coral reefs.'
    },
    {
      id: 'q5',
      type: 'short-answer',
      question: 'Explain the difference between species diversity and genetic diversity.',
      correctAnswer: 'Species diversity is the abundance and richness of different species in a given place. Genetic diversity is the variety of forms of genes (alleles) within a species.',
      explanation: 'Both are components of biodiversity. Species diversity considers how many different species exist and their relative abundance. Genetic diversity considers variation within a single species, which is important for adaptation to environmental change.'
    },
    {
      id: 'q6',
      type: 'multiple-choice',
      question: 'Which feature distinguishes bony fish from cartilaginous fish?',
      options: [
        'Bony fish have fins',
        'Bony fish have an operculum covering their gills',
        'Bony fish have scales',
        'Bony fish are larger'
      ],
      correctAnswer: 'Bony fish have an operculum covering their gills',
      explanation: 'Bony fish have an operculum (bony flap) covering their gills, a swim bladder for buoyancy, and an externally visible lateral line. Cartilaginous fish have exposed gill slits, no swim bladder, and denticles instead of true scales.'
    },
    {
      id: 'q7',
      type: 'calculation',
      question: 'Calculate Simpson\'s index of diversity (D) for a community with: barnacles (63), hermit crabs (8), sea slaters (55), periwinkles (22), rock snails (11), limpets (6). Show your working.',
      correctAnswer: 'D = 0.714',
      explanation: 'N = 165. Sum of (n/N)²: (63/165)² + (8/165)² + (55/165)² + (22/165)² + (11/165)² + (6/165)² = 0.146 + 0.002 + 0.111 + 0.018 + 0.004 + 0.001 = 0.282. D = 1 - 0.282 ≈ 0.714 (to 3 d.p.)'
    },
    {
      id: 'q8',
      type: 'multiple-choice',
      question: 'What are the THREE main parts of macroalgae (kelp)?',
      options: [
        'Roots, stem, leaves',
        'Holdfast, stipe, blades',
        'Anchor, trunk, fronds',
        'Base, column, paddles'
      ],
      correctAnswer: 'Holdfast, stipe, blades',
      explanation: 'Holdfast anchors to the seabed (no mineral absorption), stipe is the tough vertical stalk, and blades are broad leaf-like structures that absorb light and minerals. Some also have gas bladders for buoyancy.'
    },
    {
      id: 'q9',
      type: 'short-answer',
      question: 'State THREE assumptions of the mark-release-recapture method.',
      correctAnswer: '1) Marked individuals are unaffected by the tagging process. 2) Marked individuals disperse throughout the unmarked population. 3) The second sample is a random sample.',
      explanation: 'Other assumptions include: all animals have the same probability of being marked initially, markings are not lost between samples, effects of emigration/immigration/mortality/recruitment are negligible, and all marked animals in the second sample are reported.'
    },
    {
      id: 'q10',
      type: 'multiple-choice',
      question: 'Which sampling method involves placing frame quadrats at regular intervals along a rope from high tide to low tide?',
      options: [
        'Line transect',
        'Belt transect',
        'Random sampling',
        'Continuous sampling'
      ],
      correctAnswer: 'Belt transect',
      explanation: 'A belt transect places frame quadrats at regular intervals on one side of the transect line to record frequency or percentage cover. A line transect only records species touching the line. Belt transects give additional data on abundance.'
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
          title: 'AICE Marine Science - Classification and Biodiversity Study Guide',
          text: 'Check out this comprehensive study guide for AICE Marine Science Chapter 4!',
          url: window.location.href
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const saveToMyGuides = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save guides to your collection.",
        variant: "destructive"
      })
      router.push("/auth/signin")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/study-guides/save-static", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: "marinescience-exam4-classificationandbiodiversity",
          title: "AICE Marine Science - Chapter 4: Classification and Biodiversity",
          subject: "science",
          gradeLevel: "high-school",
          staticRoute: "/marinescience/exam4-classificationandbiodiversity",
          userId: user.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === "Guide already saved") {
          toast({
            title: "Already saved",
            description: "This guide is already in your collection."
          })
        } else {
          throw new Error(data.error || "Failed to save guide")
        }
        return
      }

      toast({
        title: "Saved!",
        description: "Guide added to your collection."
      })
    } catch (error) {
      console.error("Error saving guide:", error)
      toast({
        title: "Error",
        description: "Failed to save guide. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
        <div className="container mx-auto px-4 py-4 md:py-8">
          <div className="flex flex-col items-center gap-4 md:relative">
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

            <div className="text-center w-full">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                AICE Marine Science
              </h1>
              <h2 className="text-base sm:text-lg md:text-xl opacity-90">Chapter 4: Classification and Biodiversity - Study Guide</h2>
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
                    Congratulations! You&apos;ve completed all sections. You&apos;re ready for the exam!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exam Format */}
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Exam Format (83 marks total)</CardTitle>
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
                  <Badge variant="outline">43 marks</Badge>
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

          {/* 4.1 Classification of Marine Organisms */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('classification')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Taxonomic Classification & Binomial Nomenclature
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('classification')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'classification')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('classification') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('classification') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Taxonomic Hierarchy (largest to smallest):</h4>
                    <div className="bg-blue-600 text-white p-4 rounded-lg text-center">
                      <div className="text-lg font-bold">Domain &rarr; Kingdom &rarr; Phylum &rarr; Class &rarr; Order &rarr; Family &rarr; Genus &rarr; Species</div>
                      <div className="text-sm mt-2 opacity-90">Remember: &quot;Dear King Philip Came Over For Good Spaghetti&quot;</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Example: Blue Shark (<em>Prionace glauca</em>)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-blue-600 text-white">
                            <th className="border border-gray-300 p-2 text-left">Level</th>
                            <th className="border border-gray-300 p-2 text-left">Classification</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2">Domain</td><td className="border border-gray-300 p-2">Eukarya</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2">Kingdom</td><td className="border border-gray-300 p-2">Animalia</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2">Phylum</td><td className="border border-gray-300 p-2">Chordata</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2">Class</td><td className="border border-gray-300 p-2">Chondrichthyes</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2">Order</td><td className="border border-gray-300 p-2">Carcharhiniformes</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2">Family</td><td className="border border-gray-300 p-2">Carcharhinidae</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2">Genus</td><td className="border border-gray-300 p-2"><em>Prionace</em></td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2">Species</td><td className="border border-gray-300 p-2"><em>glauca</em></td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Alert className="border-green-200 bg-green-50">
                    <Star className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>EXAM TIP - Binomial Nomenclature Rules:</strong>
                      <ul className="mt-1 space-y-1 text-sm">
                        <li>&bull; Two-part Latin name: <strong>Genus + species</strong></li>
                        <li>&bull; Genus has a <strong>capital letter</strong>, species is <strong>lowercase</strong></li>
                        <li>&bull; In print: <em>italicised</em>. By hand: <u>underlined</u> (each word separately)</li>
                        <li>&bull; Example: <em>Prionace glauca</em> (blue shark)</li>
                        <li>&bull; <strong>Why use binomial names instead of common names?</strong> Common names vary between languages and regions (e.g., &quot;sea bass&quot; refers to different species in different countries). Binomial names are <strong>universal</strong>, understood by scientists worldwide, and avoid confusion or ambiguity.</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Dichotomous Keys:</h4>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>&bull; An identification tool using a series of choices between <strong>alternative characteristics</strong></li>
                      <li>&bull; Each choice leads to another stage or identifies the species</li>
                      <li>&bull; Used by marine scientists to determine which species a specimen belongs to</li>
                      <li>&bull; You must be able to <strong>construct and use</strong> simple dichotomous keys</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Plankton */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('plankton')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Plankton: Phytoplankton & Zooplankton
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('plankton')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'plankton')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('plankton') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('plankton') && (
              <CardContent>
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="border border-gray-300 p-2 text-left">Feature</th>
                          <th className="border border-gray-300 p-2 text-left">Phytoplankton</th>
                          <th className="border border-gray-300 p-2 text-left">Zooplankton</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong>Role</strong></td>
                          <td className="border border-gray-300 p-2"><strong className="text-green-600">PRODUCERS</strong> (photosynthesis)</td>
                          <td className="border border-gray-300 p-2"><strong className="text-orange-600">CONSUMERS</strong></td>
                        </tr>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong>Types</strong></td>
                          <td className="border border-gray-300 p-2">Diatoms (silica cell wall), Dinoflagellates (no silica wall)</td>
                          <td className="border border-gray-300 p-2">Larvae, Copepods, Jellyfish, Krill</td>
                        </tr>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong>Size groups</strong></td>
                          <td className="border border-gray-300 p-2">Picoplankton (0.2-2 &mu;m), Nanoplankton (2-20 &mu;m), Microplankton (20-200 &mu;m)</td>
                          <td className="border border-gray-300 p-2">Various sizes, from microscopic larvae to large jellyfish</td>
                        </tr>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong>Importance</strong></td>
                          <td className="border border-gray-300 p-2">Base of food webs, remove CO2, produce oxygen</td>
                          <td className="border border-gray-300 p-2">Critical link between producers and larger consumers</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>CRITICAL: Harmful Algal Blooms (HABs):</strong>
                      <ul className="mt-1 space-y-1 text-sm">
                        <li>&bull; Some dinoflagellate blooms produce <strong>toxins</strong> that poison fish and shellfish</li>
                        <li>&bull; Called <strong>red tides</strong> (ocean turns red)</li>
                        <li>&bull; Contaminated shellfish can cause poisoning in humans</li>
                        <li>&bull; <strong>Mechanism:</strong> Agricultural run-off carries fertilisers (nitrates/phosphates) into coastal waters &rarr; excess nutrients cause <strong>eutrophication</strong> &rarr; dinoflagellate population explodes &rarr; HAB &rarr; toxins accumulate in food chain</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Key Zooplankton Examples:</h4>
                    <ul className="space-y-2 ml-4">
                      <li><strong>Copepods:</strong> Most abundant/diverse zooplankton. Body: head, thorax, abdomen. Calcium carbonate exoskeleton. Feed on diatoms.</li>
                      <li><strong>Jellyfish:</strong> Cnidarians with transparent bell (medusa) and tentacles. Nematocysts (stinging cells) to kill plankton and larval fish.</li>
                      <li><strong>Krill:</strong> Shrimp-like carnivores. ~110 billion kg biomass in Southern Ocean. Vital food for fish, birds, seals, baleen whales.</li>
                      <li><strong>Larvae:</strong> Planktonic stage of nearly all fish and invertebrates (e.g., seastar larvae).</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Echinoderms */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('echinoderms')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Echinoderms
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('echinoderms')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'echinoderms')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('echinoderms') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('echinoderms') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Key Features:</h4>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>&bull; Name means &quot;spiny skin&quot; (Greek)</li>
                      <li>&bull; <strong>Pentaradial symmetry:</strong> 5 arms (or fans) radiating from a central body cavity</li>
                      <li>&bull; <strong>Tube feet:</strong> Water-filled tubes for locomotion, feeding, respiration, and sticking to seabed</li>
                      <li>&bull; Hard <strong>calcium carbonate skeleton</strong> covered by thin skin</li>
                      <li>&bull; Planktonic larvae develop into adults with pentaradial symmetry</li>
                      <li>&bull; Over 7,000 species, from intertidal to benthic depths</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Five Main Classes:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div className="bg-blue-50 p-2 rounded text-center text-sm border"><strong>Seastars</strong><br/>(Starfish)</div>
                      <div className="bg-blue-50 p-2 rounded text-center text-sm border"><strong>Brittle Stars</strong></div>
                      <div className="bg-blue-50 p-2 rounded text-center text-sm border"><strong>Sea Lilies</strong></div>
                      <div className="bg-blue-50 p-2 rounded text-center text-sm border"><strong>Sea Cucumbers</strong></div>
                      <div className="bg-blue-50 p-2 rounded text-center text-sm border"><strong>Sea Urchins</strong></div>
                    </div>
                  </div>

                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertDescription className="text-orange-800">
                      <h4 className="font-semibold mb-2">Ecological Importance:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>&bull; <strong>Coral reefs:</strong> Crown-of-thorns starfish (COTS) is a keystone species - feeds on fast-growing corals, increasing biodiversity. But COTS outbreaks destroy reefs.</li>
                        <li>&bull; <strong>Kelp forests:</strong> Sea urchins feed on kelp holdfasts. Sea otters control urchin populations. Without otters &rarr; urchin barrens.</li>
                        <li>&bull; <strong>Sandy shores:</strong> Sea cucumbers filter seawater and burrow, providing oxygen to buried organisms.</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-purple-200 bg-purple-50">
                    <AlertDescription className="text-purple-800">
                      <h4 className="font-semibold mb-2">Economic Importance:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>&bull; Sea cucumbers: delicacy in Chinese cuisines, source of pharmaceutical drugs</li>
                        <li>&bull; Sea urchins: eaten in Japan, New Zealand, Peru, Spain, France</li>
                        <li>&bull; Sea urchin calcium carbonate endoskeleton used to raise soil pH</li>
                        <li>&bull; COTS can damage ecotourism by destroying coral reefs</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Crustaceans */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('crustaceans')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Crustaceans
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('crustaceans')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'crustaceans')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('crustaceans') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('crustaceans') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Key Features:</h4>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>&bull; Hard <strong>exoskeleton</strong> made of calcium and chitin (polysaccharide)</li>
                      <li>&bull; Body divided into <strong>cephalothorax</strong> (head+thorax) and segmented <strong>abdomen</strong></li>
                      <li>&bull; <strong>Carapace</strong> protects dorsal side of cephalothorax</li>
                      <li>&bull; Two pairs of <strong>antennae</strong> (one shorter pair: antennules)</li>
                      <li>&bull; <strong>Jointed legs</strong> (at least 5 pairs = decapods / ten-legged)</li>
                      <li>&bull; Two-part limbs (unique among arthropods)</li>
                      <li>&bull; <strong>Claws (chela)</strong>, walking legs (pereiopods), swimmerets (pleopods)</li>
                      <li>&bull; Fan-shaped tail: uropod and telson</li>
                      <li>&bull; Distinctive larval form called a <strong>nauplius</strong></li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Examples:</h4>
                    <p className="text-sm">Crabs, crayfish, lobster, prawns, shrimp, barnacles, copepods, krill, amphipods, fish lice</p>
                  </div>

                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>EXAM TIP - Biological Drawings:</strong> You may be asked to make a <strong>biological drawing</strong> of a crustacean specimen. Rules: draw <strong>large</strong> (at least half the page), use <strong>continuous single lines</strong> (no sketchy/feathered lines), <strong>no shading or colouring</strong>, label clearly with <strong>ruled label lines</strong> that do not cross, include a <strong>title</strong> and <strong>magnification</strong>.
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <h4 className="font-semibold mb-2">Ecological Importance:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>&bull; Found from deep benthic habitats to surface pelagic waters</li>
                        <li>&bull; <strong>Scavengers:</strong> Recycle nutrients by consuming dead/decaying matter</li>
                        <li>&bull; <strong>Seagrass meadows:</strong> Shrimps graze algae off seagrass blades, preventing sunlight blockage</li>
                        <li>&bull; <strong>Food source:</strong> Copepods and krill are crucial trophic links in marine food chains</li>
                        <li>&bull; Krill: ~110 billion kg biomass in Southern Ocean, food for whales, seals, fish, birds</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800">
                      <h4 className="font-semibold mb-2">Economic Importance:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>&bull; Prawns, shrimps, krill, crabs, crayfish, lobsters consumed by humans</li>
                        <li>&bull; Copepods and krill form the largest animal biomass on Earth</li>
                        <li>&bull; Krill oil: omega-3, used in pharmaceutical and aquaculture industries</li>
                        <li>&bull; Can be harmful to aquaculture (water fleas, fish lice are parasites)</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Bony Fish */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('bony-fish')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Bony Fish (Osteichthyes)
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('bony-fish')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'bony-fish')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('bony-fish') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('bony-fish') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">External Features (96% of all fish):</h4>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>&bull; <strong>Gills:</strong> Membranous structures for gas exchange (O2 and CO2), supported by bony gill arches</li>
                      <li>&bull; <strong>Operculum:</strong> Bony flap covering/protecting gills, enables ventilation</li>
                      <li>&bull; <strong>Lateral line:</strong> Canal on head and side containing sense organs (detect vibrations, electric fields) - externally visible</li>
                      <li>&bull; <strong>Scales:</strong> Overlapping bone segments covered in skin/mucus. Cycloid (smooth) or ctenoid (toothed). Growth rings show age.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Five Types of Fins:</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                          <tr className="bg-blue-600 text-white">
                            <th className="border border-gray-300 p-2 text-left">Fin</th>
                            <th className="border border-gray-300 p-2 text-left">Location</th>
                            <th className="border border-gray-300 p-2 text-left">Function</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Pectoral</strong></td><td className="border border-gray-300 p-2">Pairs, behind operculum</td><td className="border border-gray-300 p-2">Turning, balance, stopping, swimming</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Pelvic</strong></td><td className="border border-gray-300 p-2">Pairs, ventral/front</td><td className="border border-gray-300 p-2">Stability (ventral fins)</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Anal</strong></td><td className="border border-gray-300 p-2">Ventral, behind anus</td><td className="border border-gray-300 p-2">Stabilise while swimming</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Dorsal</strong></td><td className="border border-gray-300 p-2">Back surface (up to 3)</td><td className="border border-gray-300 p-2">Steering, balance, protection (spines)</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Caudal</strong></td><td className="border border-gray-300 p-2">Tail</td><td className="border border-gray-300 p-2">Main propulsion power</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800">
                      <h4 className="font-semibold mb-2">Caudal Fin Shapes & Speed:</h4>
                      <p className="text-sm"><strong>Rounded</strong> (butterfly fish, slow) &rarr; <strong>Truncated</strong> (salmon) &rarr; <strong>Forked</strong> (anchoveta) &rarr; <strong>Lunate</strong> (tuna) &rarr; <strong>Heterocercal</strong> (blue shark, fastest)</p>
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Internal Feature:</h4>
                    <div className="border-l-4 border-blue-600 pl-4 text-sm">
                      <strong>Swim bladder:</strong> A gas-filled buoyancy organ. By adding/releasing gas, bony fish stay at any depth without constant swimming. Cartilaginous fish lack this.
                    </div>
                  </div>

                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <h4 className="font-semibold mb-2">Ecological Importance:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>&bull; 27,000+ species storing organic nutrients in their tissues</li>
                        <li>&bull; Trophic link: planktivorous fish connect plankton to higher consumers</li>
                        <li>&bull; Excrete nitrates and phosphates that primary producers absorb</li>
                        <li>&bull; Salmon as keystone species: migrate upstream, bears feed on them, carcasses fertilise soil</li>
                        <li>&bull; Dead fish washed ashore redistribute nutrients between ocean and land</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-purple-200 bg-purple-50">
                    <AlertDescription className="text-purple-800">
                      <h4 className="font-semibold mb-2">Case Study: Peruvian Anchoveta</h4>
                      <ul className="space-y-1 text-sm">
                        <li>&bull; Biggest single species fishery in the world</li>
                        <li>&bull; Filter feeders (gill rakers), grow to 20 cm, live 1-3 years</li>
                        <li>&bull; Forage fish: food for tuna, dolphins, whales, gulls, pelicans</li>
                        <li>&bull; El Nino events reduce catch (thermocline deepens, fewer nutrients)</li>
                        <li>&bull; Collapsed in 1972 from overfishing + El Nino</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Cartilaginous Fish */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('cartilaginous-fish')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Cartilaginous Fish (Chondrichthyes)
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('cartilaginous-fish')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'cartilaginous-fish')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('cartilaginous-fish') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('cartilaginous-fish') && (
              <CardContent>
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="border border-gray-300 p-2 text-left">Feature</th>
                          <th className="border border-gray-300 p-2 text-left">Bony Fish</th>
                          <th className="border border-gray-300 p-2 text-left">Cartilaginous Fish</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Skeleton</strong></td><td className="border border-gray-300 p-2">Bone</td><td className="border border-gray-300 p-2">Cartilage (less calcium, softer, more flexible)</td></tr>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Gill covering</strong></td><td className="border border-gray-300 p-2">Operculum (bony flap)</td><td className="border border-gray-300 p-2">5-7 exposed gill slits + spiracle</td></tr>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Swim bladder</strong></td><td className="border border-gray-300 p-2">Yes</td><td className="border border-gray-300 p-2">No - must keep swimming to stay buoyant</td></tr>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Scales</strong></td><td className="border border-gray-300 p-2">Cycloid/ctenoid scales</td><td className="border border-gray-300 p-2">Denticles (tooth-like, sandpaper feel)</td></tr>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Lateral line</strong></td><td className="border border-gray-300 p-2">Externally visible</td><td className="border border-gray-300 p-2">Under the skin (not visible)</td></tr>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Ventilation</strong></td><td className="border border-gray-300 p-2">Operculum pumps water</td><td className="border border-gray-300 p-2">Ram ventilation or pumped ventilation</td></tr>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Caudal fin</strong></td><td className="border border-gray-300 p-2">Various shapes</td><td className="border border-gray-300 p-2">Heterocercal (upper lobe larger)</td></tr>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Fins (sharks)</strong></td><td className="border border-gray-300 p-2">Varies</td><td className="border border-gray-300 p-2">8 fins: 2 pectoral, 1 caudal, 2 pelvic, 1 anal, 2 dorsal</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>EXAM TIP:</strong> The bony vs cartilaginous fish comparison table is a VERY common exam question. Know at least 4 differences!
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <h4 className="font-semibold mb-2">Ecological Importance of Sharks:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>&bull; <strong>Keystone species</strong> - apex predators maintaining balance in food webs</li>
                        <li>&bull; Remove weak and diseased individuals, keeping prey populations healthy</li>
                        <li>&bull; Control invasive species (e.g., lionfish)</li>
                        <li>&bull; When sharks are overharvested: groupers increase &rarr; herbivores (yellow tang) decrease &rarr; algae overgrows coral</li>
                        <li>&bull; Blue shark populations fallen 80% - IUCN classifies as &quot;near threatened&quot;</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800">
                      <h4 className="font-semibold mb-2">Economic Importance:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>&bull; Shark finning: fins cut off, rest discarded - highly destructive</li>
                        <li>&bull; Shark liver oil: vitamin A, lubricant, cosmetics</li>
                        <li>&bull; Shark leather: more durable than cowhide</li>
                        <li>&bull; Ecotourism: reef shark worth US$250,000 over lifetime vs $50 to fisherman</li>
                        <li>&bull; Game fishing provides economic benefits to coastal communities</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Macroalgae */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('macroalgae')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Macroalgae (Kelp & Seaweeds)
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('macroalgae')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'macroalgae')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('macroalgae') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('macroalgae') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Structure of Macroalgae (Thallus):</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                          <tr className="bg-blue-600 text-white">
                            <th className="border border-gray-300 p-2 text-left">Part</th>
                            <th className="border border-gray-300 p-2 text-left">Description</th>
                            <th className="border border-gray-300 p-2 text-left">Function</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Holdfast</strong></td><td className="border border-gray-300 p-2">Root-like structure</td><td className="border border-gray-300 p-2">Anchors to seabed only (NO mineral absorption)</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Stipe</strong></td><td className="border border-gray-300 p-2">Long, tough vertical stalk</td><td className="border border-gray-300 p-2">Extends from holdfast to blades, very tough to prevent breakage</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Blades</strong></td><td className="border border-gray-300 p-2">Broad leaf-like structures</td><td className="border border-gray-300 p-2">Large surface area to absorb light and minerals</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Gas bladders</strong></td><td className="border border-gray-300 p-2">Pneumatocysts under blades</td><td className="border border-gray-300 p-2">Keep blades upright in photic zone for photosynthesis</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Alert className="border-green-200 bg-green-50">
                    <Star className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>EXAM TIP:</strong> Macroalgae are <strong>photoautotrophs</strong> - they make their own food using light from the Sun. This is why they only grow in shallow waters where light can penetrate. <em>Macrocystis</em> can grow up to 0.5 metres per day and reach 80 m!
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Kelp Forest Ecology:</h4>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>&bull; Require nutrient-rich, clear water between 8-16&deg;C</li>
                      <li>&bull; Generate large quantities of detritus - base of food chains</li>
                      <li>&bull; Crucial habitats for diverse range of fauna</li>
                      <li>&bull; Sea otters are a <strong>keystone species</strong> in kelp forests (control sea urchins)</li>
                    </ul>
                  </div>

                  <Alert className="border-purple-200 bg-purple-50">
                    <AlertDescription className="text-purple-800">
                      <h4 className="font-semibold mb-2">Economic Importance of Macroalgae:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>&bull; <strong>Cooking:</strong> Nori (sushi), 20+ species eaten in Japan, Korea, Iceland, Wales</li>
                        <li>&bull; <strong>Food industry:</strong> Alginate (gels, ice cream), Agar (jellies, microbiology plates), Carrageenan (chocolate, milk drinks)</li>
                        <li>&bull; <strong>Cosmetics/medicine:</strong> Skin creams, herbal remedies for arthritis</li>
                        <li>&bull; <strong>Fertiliser:</strong> Rich source of nutrients for farmland</li>
                        <li>&bull; <strong>Mariculture:</strong> ~8 million tonnes/year, worth US$6 billion globally</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Marine Plants */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('marine-plants')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Marine Plants (Seagrasses)
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('marine-plants')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'marine-plants')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('marine-plants') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('marine-plants') && (
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>Do NOT confuse seagrasses (marine plants) with seaweeds (macroalgae)!</strong> Key differences:
                    </AlertDescription>
                  </Alert>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="border border-gray-300 p-2 text-left">Feature</th>
                          <th className="border border-gray-300 p-2 text-left">Macroalgae (Seaweed)</th>
                          <th className="border border-gray-300 p-2 text-left">Seagrass (Marine Plant)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Classification</strong></td><td className="border border-gray-300 p-2">Protoctista (NOT a plant)</td><td className="border border-gray-300 p-2">Plantae (flowering plant)</td></tr>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Anchoring</strong></td><td className="border border-gray-300 p-2">Holdfast (no mineral absorption)</td><td className="border border-gray-300 p-2">True roots (absorb nutrients from sediment)</td></tr>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Structure</strong></td><td className="border border-gray-300 p-2">Stipe + blades (no vascular tissue)</td><td className="border border-gray-300 p-2">Stems + leaves (vascular tissue present)</td></tr>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Reproduction</strong></td><td className="border border-gray-300 p-2">Spores</td><td className="border border-gray-300 p-2">Flowers &amp; seeds (also rhizomes for asexual)</td></tr>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Nutrient uptake</strong></td><td className="border border-gray-300 p-2">Whole body absorbs from water</td><td className="border border-gray-300 p-2">Roots from sediment, leaves from water</td></tr>
                        <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Gas exchange</strong></td><td className="border border-gray-300 p-2">Whole surface</td><td className="border border-gray-300 p-2">No stomata; thin cuticle allows diffusion; aerenchyma delivers O2 internally</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Key Adaptations of Seagrasses:</h4>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>&bull; <strong>Roots:</strong> Anchor plant, absorb nutrients from sediment</li>
                      <li>&bull; <strong>Rhizomes:</strong> Horizontal underground structures for asexual reproduction</li>
                      <li>&bull; <strong>Leaves:</strong> Thin, flexible (don&apos;t break in currents), no stomata, thin waxy cuticle, chloroplasts in epidermis</li>
                      <li>&bull; <strong>Flowers:</strong> For sexual reproduction; pollen carried by water</li>
                      <li>&bull; <strong>Aerenchyma:</strong> Specialised air-containing tissue in stems delivers O2 to submerged parts</li>
                      <li>&bull; Few vascular bundles (no need to transport water long distances)</li>
                      <li>&bull; Cells adapted to saltwater by osmosis</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Types of Marine Plants:</h4>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>&bull; <strong>Floating:</strong> e.g., water cabbage (Brazilian wetlands)</li>
                      <li>&bull; <strong>Emergent:</strong> Rooted, project above surface (e.g., mangroves)</li>
                      <li>&bull; <strong>Submergent:</strong> Rooted below waterline - seagrasses (72 species, shallow 4-24&deg;C waters)</li>
                    </ul>
                  </div>

                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <h4 className="font-semibold mb-2">Ecological Importance of Seagrasses:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>&bull; <strong>Keystone species</strong> - sensitivity to water quality indicates ecosystem health</li>
                        <li>&bull; Food source for turtles (<em>Thalassia testudinum</em>), manatees, herbivorous fish</li>
                        <li>&bull; Detritus feeds worms, sea cucumbers, crabs, sea anemones</li>
                        <li>&bull; Nursery habitat for larval and juvenile vertebrates and invertebrates</li>
                        <li>&bull; Hold ~15% of ocean&apos;s total carbon (only 0.2% of ocean area!)</li>
                        <li>&bull; Produce oxygen, trap silt, reduce turbidity, improve water clarity</li>
                        <li>&bull; Root systems bind sediment, reducing erosion</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Biodiversity */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('biodiversity')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Biodiversity: Types & Importance
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('biodiversity')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'biodiversity')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('biodiversity') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('biodiversity') && (
              <CardContent>
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="border border-gray-300 p-2 text-left">Type</th>
                          <th className="border border-gray-300 p-2 text-left">Definition</th>
                          <th className="border border-gray-300 p-2 text-left">Example</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong className="text-green-600">Species Diversity</strong></td>
                          <td className="border border-gray-300 p-2">Abundance and richness of different species in a given place</td>
                          <td className="border border-gray-300 p-2">Coral reefs have high species diversity; sandy shores have low</td>
                        </tr>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong className="text-blue-600">Genetic Diversity</strong></td>
                          <td className="border border-gray-300 p-2">Variety of forms of genes (alleles) within a species</td>
                          <td className="border border-gray-300 p-2">Different allele frequencies in separate salmon populations. Low genetic diversity (e.g., cheetahs) = species is vulnerable because fewer alleles means less ability to adapt to environmental change or resist new diseases</td>
                        </tr>
                        <tr className="even:bg-gray-50">
                          <td className="border border-gray-300 p-2"><strong className="text-purple-600">Ecological Diversity</strong></td>
                          <td className="border border-gray-300 p-2">Variation of ecosystems/habitats at regional or global level</td>
                          <td className="border border-gray-300 p-2">Coral reefs, kelp forests, hydrothermal vents, rocky shores</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Why Marine Biodiversity Matters:</h4>
                    <ul className="space-y-2 ml-4 text-sm">
                      <li><strong>Stable ecosystems:</strong> More species = more resilient to environmental change</li>
                      <li><strong>Coastal protection:</strong> Roots of seagrasses/mangroves reduce erosion; reefs absorb wave energy</li>
                      <li><strong>Climate control:</strong> Phytoplankton and seagrasses store 2x more CO2 per hectare than rainforests</li>
                      <li><strong>Food sources:</strong> Macroalgae, crustaceans, fish - staple foods for humans</li>
                      <li><strong>Medicine:</strong> 41% of marine-derived chemicals are anti-cancer; KLH from keyhole limpets used in immunotherapy</li>
                    </ul>
                  </div>

                  <Alert className="border-green-200 bg-green-50">
                    <Star className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>High vs Low Biodiversity:</strong> High species index = more successful species, more stable ecosystem, more ecological niches, complex food webs, less vulnerable to change. Low species index = extreme/unstable environment, simple food webs, vulnerable to change.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Populations & Sampling */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('populations-sampling')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Populations, Ecosystems & Sampling Methods
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('populations-sampling')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'populations-sampling')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('populations-sampling') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('populations-sampling') && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Key Ecology Definitions:</h4>
                    <div className="space-y-3">
                      <div className="border-l-4 border-blue-600 pl-4"><strong>Ecosystem:</strong> The living organisms and the environment with which they interact</div>
                      <div className="border-l-4 border-green-600 pl-4"><strong>Habitat:</strong> The natural environment where an organism lives</div>
                      <div className="border-l-4 border-purple-600 pl-4"><strong>Niche:</strong> The role of a species within an ecosystem (feeding, spatial, temporal relationships)</div>
                      <div className="border-l-4 border-orange-600 pl-4"><strong>Species:</strong> A group of similar organisms that can interbreed naturally to produce fertile offspring</div>
                      <div className="border-l-4 border-red-600 pl-4"><strong>Population:</strong> All individuals of the same species living at the same place and time</div>
                      <div className="border-l-4 border-pink-600 pl-4"><strong>Community:</strong> An association of all the different species occupying a habitat at the same time</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Biotic vs Abiotic Factors:</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                          <tr className="bg-blue-600 text-white">
                            <th className="border border-gray-300 p-2 text-left">Biotic Factors (living)</th>
                            <th className="border border-gray-300 p-2 text-left">Abiotic Factors (non-living)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="even:bg-gray-50">
                            <td className="border border-gray-300 p-2">Predator-prey relationships</td>
                            <td className="border border-gray-300 p-2"><strong>Geological:</strong> Substrate type, seafloor topography</td>
                          </tr>
                          <tr className="even:bg-gray-50">
                            <td className="border border-gray-300 p-2">Competition (intra- & inter-specific)</td>
                            <td className="border border-gray-300 p-2"><strong>Physical:</strong> Temperature, light, waves, tides, currents, pressure</td>
                          </tr>
                          <tr className="even:bg-gray-50">
                            <td className="border border-gray-300 p-2">Disease</td>
                            <td className="border border-gray-300 p-2"><strong>Chemical:</strong> pH, salinity, O2, CO2, nutrients (nitrate/phosphate)</td>
                          </tr>
                          <tr className="even:bg-gray-50">
                            <td className="border border-gray-300 p-2">Symbiosis (mutualism, parasitism, commensalism)</td>
                            <td className="border border-gray-300 p-2">These can all be <strong>limiting factors</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Sampling Methods in the Littoral Zone:</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                          <tr className="bg-blue-600 text-white">
                            <th className="border border-gray-300 p-2 text-left">Method</th>
                            <th className="border border-gray-300 p-2 text-left">Description</th>
                            <th className="border border-gray-300 p-2 text-left">Best For</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Frame quadrat</strong></td><td className="border border-gray-300 p-2">Plastic/metal square (10-100 cm)</td><td className="border border-gray-300 p-2">Sessile (immobile) species</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Line transect</strong></td><td className="border border-gray-300 p-2">Record species touching a line between two points</td><td className="border border-gray-300 p-2">Distribution (which species present)</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Belt transect</strong></td><td className="border border-gray-300 p-2">Quadrats placed at regular intervals along transect</td><td className="border border-gray-300 p-2">Distribution AND abundance</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Continuous sampling</strong></td><td className="border border-gray-300 p-2">Samples along whole length of transect</td><td className="border border-gray-300 p-2">Complete coverage</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Systematic sampling</strong></td><td className="border border-gray-300 p-2">Samples at fixed intervals</td><td className="border border-gray-300 p-2">Regular spacing along gradient</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Random sampling</strong></td><td className="border border-gray-300 p-2">Quadrat placed at random locations (computer-generated)</td><td className="border border-gray-300 p-2">Uniform habitats, no observer bias</td></tr>
                          <tr className="even:bg-gray-50"><td className="border border-gray-300 p-2"><strong>Mark-release-recapture</strong></td><td className="border border-gray-300 p-2">Capture, mark, release, recapture</td><td className="border border-gray-300 p-2">Mobile species (use Lincoln index)</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Alert className="border-green-200 bg-green-50">
                    <Star className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>EXAM TIP - Rocky Shore vs Sandy Shore Biodiversity:</strong>
                      <ul className="mt-1 space-y-1 text-sm">
                        <li>&bull; <strong>Rocky shores</strong> have <strong>higher biodiversity</strong> - hard substrate provides attachment points for sessile organisms (barnacles, mussels, macroalgae), creating complex 3D habitats with many niches (rock pools, crevices, overhangs)</li>
                        <li>&bull; <strong>Sandy shores</strong> have <strong>lower biodiversity</strong> - unstable substrate, no attachment points, organisms must burrow, fewer niches, harsh wave exposure</li>
                        <li>&bull; Use Simpson&apos;s index to compare: rocky shore D will be higher (closer to 1) than sandy shore D</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800">
                      <h4 className="font-semibold mb-2">Kite Graphs:</h4>
                      <p className="text-sm">Used to display distribution and abundance of organisms in the littoral zone. X-axis = distance from high/low tide. Y-axis = organism. Width of kite shows abundance. Line plots of abiotic data (e.g., profile/height) can be included at the bottom.</p>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Simpson's Index */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('simpsons-index')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Simpson&apos;s Index of Diversity (D)
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('simpsons-index')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'simpsons-index')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('simpsons-index') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('simpsons-index') && (
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-blue-200 bg-blue-50">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <h4 className="font-semibold text-blue-700 mb-3">Simpson&apos;s Index Formula:</h4>
                      <div className="bg-white p-4 rounded border text-center text-lg font-mono">
                        D = 1 - &Sigma;(n/N)&sup2;
                      </div>
                      <div className="mt-3 text-sm space-y-1">
                        <p><strong>&Sigma;</strong> = sum of (total)</p>
                        <p><strong>n</strong> = number of individuals of each <em>different</em> species</p>
                        <p><strong>N</strong> = total number of individuals of <em>all</em> species</p>
                        <p><strong>D</strong> ranges from 0 (no diversity) to 1 (infinite diversity)</p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <h4 className="font-semibold mb-2">Worked Example: Whale Fall Data</h4>
                      <div className="text-sm space-y-2">
                        <p>Sharks: 2, Amphipods: 8, Whales: 1, Hagfish: 1, Crabs: 3. <strong>N = 15</strong></p>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300 mt-2">
                            <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-1">Species</th><th className="border border-gray-300 p-1">n</th><th className="border border-gray-300 p-1">n/N</th><th className="border border-gray-300 p-1">(n/N)&sup2;</th></tr></thead>
                            <tbody>
                              <tr><td className="border border-gray-300 p-1">Sharks</td><td className="border border-gray-300 p-1">2</td><td className="border border-gray-300 p-1">0.133</td><td className="border border-gray-300 p-1">0.018</td></tr>
                              <tr><td className="border border-gray-300 p-1">Amphipods</td><td className="border border-gray-300 p-1">8</td><td className="border border-gray-300 p-1">0.533</td><td className="border border-gray-300 p-1">0.284</td></tr>
                              <tr><td className="border border-gray-300 p-1">Whales</td><td className="border border-gray-300 p-1">1</td><td className="border border-gray-300 p-1">0.067</td><td className="border border-gray-300 p-1">0.004</td></tr>
                              <tr><td className="border border-gray-300 p-1">Hagfish</td><td className="border border-gray-300 p-1">1</td><td className="border border-gray-300 p-1">0.067</td><td className="border border-gray-300 p-1">0.004</td></tr>
                              <tr><td className="border border-gray-300 p-1">Crabs</td><td className="border border-gray-300 p-1">3</td><td className="border border-gray-300 p-1">0.200</td><td className="border border-gray-300 p-1">0.040</td></tr>
                              <tr className="font-semibold"><td className="border border-gray-300 p-1">Total</td><td className="border border-gray-300 p-1">15</td><td className="border border-gray-300 p-1"></td><td className="border border-gray-300 p-1">&Sigma; = 0.350</td></tr>
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-2"><strong>D = 1 - 0.350 = 0.650</strong></p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>EXAM TIP:</strong> Always SHOW YOUR WORKING in Simpson&apos;s index calculations. Create a table with columns for n, n/N, and (n/N)&sup2;. Give your answer to 3 decimal places.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Richness vs Evenness:</h4>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>&bull; <strong>Richness:</strong> The number of species in a community (1 whelk counts the same as 1000 barnacles)</li>
                      <li>&bull; <strong>Evenness:</strong> How evenly individuals are distributed among species (dominated by one species = less diverse)</li>
                      <li>&bull; Simpson&apos;s index accounts for BOTH richness and evenness</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Spearman's Rank */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('spearmans-rank')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Spearman&apos;s Rank Correlation
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStudyItem('spearmans-rank')
                    }}
                    className="p-1 h-auto"
                  >
                    {studyItems.find(item => item.id === 'spearmans-rank')?.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                {expandedSections.includes('spearmans-rank') ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('spearmans-rank') && (
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-blue-200 bg-blue-50">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <h4 className="font-semibold text-blue-700 mb-3">Spearman&apos;s Rank Formula:</h4>
                      <div className="bg-white p-4 rounded border text-center text-lg font-mono">
                        r<sub>s</sub> = 1 - (6 &times; &Sigma;D&sup2;) / (n&sup3; - n)
                      </div>
                      <div className="mt-3 text-sm space-y-1">
                        <p><strong>r<sub>s</sub></strong> = Spearman&apos;s rank correlation coefficient</p>
                        <p><strong>&Sigma;D&sup2;</strong> = sum of squared differences between ranks</p>
                        <p><strong>n</strong> = number of pairs of data</p>
                        <p>Result ranges from <strong>-1</strong> (perfect negative) to <strong>+1</strong> (perfect positive), 0 = no correlation</p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Steps to Calculate:</h4>
                    <ol className="space-y-1 ml-4 text-sm">
                      <li><strong>1.</strong> State the null hypothesis (H<sub>0</sub>): there is no correlation</li>
                      <li><strong>2.</strong> Rank each data set separately (highest value = rank 1)</li>
                      <li><strong>3.</strong> Calculate D (difference between ranks) for each pair</li>
                      <li><strong>4.</strong> Square each D to get D&sup2;</li>
                      <li><strong>5.</strong> Sum all D&sup2; values to get &Sigma;D&sup2;</li>
                      <li><strong>6.</strong> Substitute into formula</li>
                      <li><strong>7.</strong> Compare calculated r<sub>s</sub> with critical value at 0.05 significance level</li>
                      <li><strong>8.</strong> If r<sub>s</sub> &gt; critical value: reject H<sub>0</sub> (significant correlation exists)</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Critical Values Table (at 0.05 significance):</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-1">n</th>
                            <th className="border border-gray-300 p-1">5</th>
                            <th className="border border-gray-300 p-1">6</th>
                            <th className="border border-gray-300 p-1">7</th>
                            <th className="border border-gray-300 p-1">8</th>
                            <th className="border border-gray-300 p-1">9</th>
                            <th className="border border-gray-300 p-1">10</th>
                            <th className="border border-gray-300 p-1">12</th>
                            <th className="border border-gray-300 p-1">14</th>
                            <th className="border border-gray-300 p-1">16</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 p-1 font-semibold">Critical r<sub>s</sub></td>
                            <td className="border border-gray-300 p-1">1.00</td>
                            <td className="border border-gray-300 p-1">0.89</td>
                            <td className="border border-gray-300 p-1">0.79</td>
                            <td className="border border-gray-300 p-1">0.76</td>
                            <td className="border border-gray-300 p-1">0.68</td>
                            <td className="border border-gray-300 p-1">0.65</td>
                            <td className="border border-gray-300 p-1">0.54</td>
                            <td className="border border-gray-300 p-1">0.51</td>
                            <td className="border border-gray-300 p-1">0.51</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>CRITICAL:</strong> Correlation does NOT imply causation! A positive correlation between species A and B doesn&apos;t mean one causes the other - there may be an independent abiotic or biotic factor affecting both.
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-green-200 bg-green-50">
                    <Star className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>EXAM TIP:</strong> Always draw a scatter graph FIRST to see if there might be a correlation. Then use Spearman&apos;s rank to test the strength. Types: positive correlation (both increase), negative correlation (one increases, other decreases), no correlation (no pattern).
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
                  Key Definitions for Exam
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
                  <div className="border-l-4 border-blue-600 pl-4"><strong>Taxonomic hierarchy:</strong> Classification of species by describing domain, kingdom, phylum, class, order, family, genus and species</div>
                  <div className="border-l-4 border-green-600 pl-4"><strong>Binomial nomenclature:</strong> The two-part Latin name (genus + species) given to each species</div>
                  <div className="border-l-4 border-purple-600 pl-4"><strong>Dichotomous key:</strong> An identification tool using a series of choices between alternative characteristics</div>
                  <div className="border-l-4 border-orange-600 pl-4"><strong>Keystone species:</strong> An organism that plays a unique and crucial role; without it, the ecosystem would be dramatically different</div>
                  <div className="border-l-4 border-red-600 pl-4"><strong>Biodiversity:</strong> The degree of variation of organisms and ecosystems on Earth (species, genetic, ecological)</div>
                  <div className="border-l-4 border-pink-600 pl-4"><strong>Ecosystem:</strong> The living organisms and the environment with which they interact</div>
                  <div className="border-l-4 border-teal-600 pl-4"><strong>Habitat:</strong> The natural environment where an organism lives</div>
                  <div className="border-l-4 border-indigo-600 pl-4"><strong>Niche:</strong> The role of a species within an ecosystem</div>
                  <div className="border-l-4 border-cyan-600 pl-4"><strong>Population:</strong> All individuals of the same species that live at the same place and time</div>
                  <div className="border-l-4 border-amber-600 pl-4"><strong>Community:</strong> An association of all the different species occupying a habitat at the same time</div>
                  <div className="border-l-4 border-lime-600 pl-4"><strong>Plankton:</strong> Microscopic free-floating marine organisms (phytoplankton = producers, zooplankton = consumers)</div>
                  <div className="border-l-4 border-rose-600 pl-4"><strong>Pentaradial symmetry:</strong> Five arms (or fans) radiating from a central body cavity (echinoderms)</div>
                  <div className="border-l-4 border-violet-600 pl-4"><strong>Nauplius:</strong> Distinctive planktonic larval stage of crustaceans</div>
                  <div className="border-l-4 border-emerald-600 pl-4"><strong>Operculum:</strong> A thin bony flap covering and protecting the gills in bony fish</div>
                  <div className="border-l-4 border-sky-600 pl-4"><strong>Denticles:</strong> Tooth-like overlapping scales on cartilaginous fish that improve hydrodynamic efficiency</div>
                  <div className="border-l-4 border-fuchsia-600 pl-4"><strong>Simpson&apos;s index of diversity (D):</strong> A biodiversity measure that accounts for both species richness and evenness</div>
                  <div className="border-l-4 border-stone-600 pl-4"><strong>Lincoln index:</strong> N = (n1 &times; n2) / m2 - estimates population size using mark-release-recapture data</div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Interactive Exam Practice Section */}
        <Card className="mt-6 border-blue-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-600">Interactive Exam Practice</CardTitle>
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
            <CardTitle className="text-green-600">Last-Minute Exam Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>&#10003; Know the taxonomic hierarchy: Domain &rarr; Kingdom &rarr; Phylum &rarr; Class &rarr; Order &rarr; Family &rarr; Genus &rarr; Species</li>
              <li>&#10003; Binomial nomenclature: Genus (capital) + species (lowercase), italicised or underlined</li>
              <li>&#10003; Know the bony vs cartilaginous fish comparison (operculum, swim bladder, denticles, gill slits, lateral line)</li>
              <li>&#10003; Macroalgae structure: holdfast, stipe, blades, gas bladders - holdfast does NOT absorb minerals</li>
              <li>&#10003; Seagrasses are PLANTS (roots, rhizomes, flowers) - NOT seaweeds (macroalgae)</li>
              <li>&#10003; Echinoderms: pentaradial symmetry + tube feet + calcium carbonate skeleton</li>
              <li>&#10003; Crustaceans: exoskeleton (calcium + chitin), cephalothorax + abdomen, nauplius larva</li>
              <li>&#10003; Three types of biodiversity: species, genetic, ecological</li>
              <li>&#10003; Keystone species: disproportionate effect on ecosystem (sea otters, COTS, sharks)</li>
              <li>&#10003; Lincoln index: N = (n1 &times; n2) / m2 - know the assumptions!</li>
              <li>&#10003; Simpson&apos;s index: D = 1 - &Sigma;(n/N)&sup2; - ALWAYS show working in a table</li>
              <li>&#10003; Spearman&apos;s rank: r<sub>s</sub> = 1 - (6&Sigma;D&sup2;)/(n&sup3;-n) - compare with critical value</li>
              <li>&#10003; Correlation does NOT equal causation</li>
              <li>&#10003; Belt transects = quadrats at intervals along line (distribution + abundance)</li>
              <li>&#10003; Know ecological AND economic importance of each organism group</li>
            </ul>
          </CardContent>
        </Card>

        {/* Study Checklist */}
        <Card className="mt-6 border-blue-300">
          <CardHeader>
            <CardTitle className="text-blue-600">Final Study Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('taxonomic-hierarchy')}>
                  {checklistItems['taxonomic-hierarchy'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['taxonomic-hierarchy'] ? 'line-through text-gray-500' : ''}>Write out taxonomic hierarchy in order</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('binomial-nomenclature')}>
                  {checklistItems['binomial-nomenclature'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['binomial-nomenclature'] ? 'line-through text-gray-500' : ''}>Explain rules of binomial nomenclature</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('dichotomous-key')}>
                  {checklistItems['dichotomous-key'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['dichotomous-key'] ? 'line-through text-gray-500' : ''}>Construct and use a simple dichotomous key</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('phytoplankton-zooplankton')}>
                  {checklistItems['phytoplankton-zooplankton'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['phytoplankton-zooplankton'] ? 'line-through text-gray-500' : ''}>Compare phytoplankton (producers) and zooplankton (consumers)</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('echinoderm-features')}>
                  {checklistItems['echinoderm-features'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['echinoderm-features'] ? 'line-through text-gray-500' : ''}>State key features of echinoderms</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('crustacean-features')}>
                  {checklistItems['crustacean-features'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['crustacean-features'] ? 'line-through text-gray-500' : ''}>State key features of crustaceans</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('bony-fish-features')}>
                  {checklistItems['bony-fish-features'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['bony-fish-features'] ? 'line-through text-gray-500' : ''}>List features of bony fish (gills, operculum, lateral line, scales, fins)</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('cartilaginous-fish-features')}>
                  {checklistItems['cartilaginous-fish-features'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['cartilaginous-fish-features'] ? 'line-through text-gray-500' : ''}>Compare bony and cartilaginous fish (4+ differences)</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('macroalgae-structure')}>
                  {checklistItems['macroalgae-structure'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['macroalgae-structure'] ? 'line-through text-gray-500' : ''}>Label macroalgae: holdfast, stipe, blades, gas bladders</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('seagrass-adaptations')}>
                  {checklistItems['seagrass-adaptations'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['seagrass-adaptations'] ? 'line-through text-gray-500' : ''}>Explain seagrass adaptations (roots, rhizomes, aerenchyma, leaves)</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('keystone-species')}>
                  {checklistItems['keystone-species'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['keystone-species'] ? 'line-through text-gray-500' : ''}>Give examples of keystone species and explain their roles</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('biodiversity-types')}>
                  {checklistItems['biodiversity-types'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['biodiversity-types'] ? 'line-through text-gray-500' : ''}>Define species, genetic, and ecological diversity</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('lincoln-index')}>
                  {checklistItems['lincoln-index'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['lincoln-index'] ? 'line-through text-gray-500' : ''}>Calculate population size using Lincoln index</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('simpsons-calculation')}>
                  {checklistItems['simpsons-calculation'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['simpsons-calculation'] ? 'line-through text-gray-500' : ''}>Calculate Simpson&apos;s index showing full working</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('spearmans-calculation')}>
                  {checklistItems['spearmans-calculation'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['spearmans-calculation'] ? 'line-through text-gray-500' : ''}>Calculate Spearman&apos;s rank and compare to critical values</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('sampling-methods')}>
                  {checklistItems['sampling-methods'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['sampling-methods'] ? 'line-through text-gray-500' : ''}>Describe all sampling methods (quadrats, transects, random, systematic)</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('biotic-abiotic')}>
                  {checklistItems['biotic-abiotic'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['biotic-abiotic'] ? 'line-through text-gray-500' : ''}>Identify biotic and abiotic factors in marine ecosystems</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => toggleChecklistItem('ecological-economic')}>
                  {checklistItems['ecological-economic'] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                  <span className={checklistItems['ecological-economic'] ? 'line-through text-gray-500' : ''}>Give ecological AND economic importance for each organism group</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <Button
          onClick={saveToMyGuides}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-white shadow-lg"
          size="lg"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <BookmarkPlus className="h-4 w-4 mr-2" />
          )}
          Save to My Guides
        </Button>
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
        <Button
          onClick={() => router.push("/")}
          variant="outline"
          className="bg-white hover:bg-gray-50 shadow-lg"
          size="lg"
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>
    </div>
  )
}
