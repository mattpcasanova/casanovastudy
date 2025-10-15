"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, BookOpen, Download, Share2, Star, CheckCircle, Circle, AlertTriangle, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface StudyItem {
  id: string
  completed: boolean
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
              🌊 AICE Marine Science
            </h1>
            <h2 className="text-xl opacity-90">Chapter 2: Earth Processes - Study Guide</h2>
            <p className="mt-4 text-sm opacity-75">Interactive study guide with progress tracking</p>
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
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="border border-gray-300 p-2 text-left">Condition</th>
                        <th className="border border-gray-300 p-2 text-left">Trade Winds</th>
                        <th className="border border-gray-300 p-2 text-left">South America</th>
                        <th className="border border-gray-300 p-2 text-left">Upwelling</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="even:bg-gray-50">
                        <td className="border border-gray-300 p-2"><strong>NORMAL</strong></td>
                        <td className="border border-gray-300 p-2">Strong (east→west)</td>
                        <td className="border border-gray-300 p-2">Cold water, good fishing</td>
                        <td className="border border-gray-300 p-2">YES</td>
                      </tr>
                      <tr className="even:bg-gray-50 bg-red-50">
                        <td className="border border-gray-300 p-2"><strong>EL NIÑO</strong></td>
                        <td className="border border-gray-300 p-2"><strong>Weaken/reverse</strong></td>
                        <td className="border border-gray-300 p-2"><strong>Warm water accumulates</strong></td>
                        <td className="border border-gray-300 p-2"><strong>STOPS</strong></td>
                      </tr>
                      <tr className="even:bg-gray-50 bg-blue-50">
                        <td className="border border-gray-300 p-2"><strong>LA NIÑA</strong></td>
                        <td className="border border-gray-300 p-2">Strengthen</td>
                        <td className="border border-gray-300 p-2">Extra cold water</td>
                        <td className="border border-gray-300 p-2">Enhanced</td>
                      </tr>
                    </tbody>
                  </table>
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

        {/* Exam Practice Section */}
        <Card className="mt-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <CardHeader>
            <CardTitle className="text-white">📝 Exam Practice Questions</CardTitle>
          </CardHeader>
          <CardContent className="text-white">
            <div className="space-y-4">
              <div className="bg-white/10 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Multiple Choice Practice:</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>1.</strong> The outermost layer of Earth's crust is composed primarily of:</p>
                  <p className="ml-4">A) Granite and similar rocks in oceanic crust</p>
                  <p className="ml-4">B) Basaltic rocks in continental crust</p>
                  <p className="ml-4 text-green-200">C) Basaltic rocks in oceanic crust ✓</p>
                  <p className="ml-4">D) Iron and magnesium in continental crust</p>
                </div>
              </div>
              
              <div className="bg-white/10 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Short Answer Practice:</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Define:</strong> Subduction zone</p>
                  <p className="ml-4 text-green-200">Answer: Area where one tectonic plate slides beneath another at a convergent boundary</p>
                  
                  <p><strong>Calculate:</strong> Tidal range if high tide = 3.2m and low tide = 0.8m</p>
                  <p className="ml-4 text-green-200">Answer: 3.2 - 0.8 = 2.4m</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Final Tips */}
        <Card className="mt-6 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <CardHeader>
            <CardTitle className="text-white">🎯 Last-Minute Exam Tips</CardTitle>
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
              <li>✓ <strong>NEW:</strong> Upwelling = cold, nutrient-rich water rises to surface</li>
              <li>✓ <strong>NEW:</strong> Coriolis effect: Northern Hemisphere deflects RIGHT</li>
              <li>✓ <strong>NEW:</strong> Surface currents = WIND driven, Deep currents = DENSITY driven</li>
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
