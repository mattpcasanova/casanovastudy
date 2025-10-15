"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, BookOpen, Download, Share2, Star, CheckCircle, Circle } from "lucide-react"
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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
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
                  {studyItems.find(item => item.id === 'earth-layers')?.completed && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleStudyItem('earth-layers')
                  }}
                >
                  {studyItems.find(item => item.id === 'earth-layers')?.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Button>
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
                  {studyItems.find(item => item.id === 'plate-tectonics')?.completed && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleStudyItem('plate-tectonics')
                  }}
                >
                  {studyItems.find(item => item.id === 'plate-tectonics')?.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Button>
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
                  {studyItems.find(item => item.id === 'weathering-erosion')?.completed && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleStudyItem('weathering-erosion')
                  }}
                >
                  {studyItems.find(item => item.id === 'weathering-erosion')?.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Button>
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
                  {studyItems.find(item => item.id === 'tides')?.completed && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleStudyItem('tides')
                  }}
                >
                  {studyItems.find(item => item.id === 'tides')?.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Button>
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
                  {studyItems.find(item => item.id === 'ocean-currents')?.completed && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleStudyItem('ocean-currents')
                  }}
                >
                  {studyItems.find(item => item.id === 'ocean-currents')?.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Button>
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
                  {studyItems.find(item => item.id === 'el-nino')?.completed && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleStudyItem('el-nino')
                  }}
                >
                  {studyItems.find(item => item.id === 'el-nino')?.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Button>
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
                  {studyItems.find(item => item.id === 'coastal-zones')?.completed && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleStudyItem('coastal-zones')
                  }}
                >
                  {studyItems.find(item => item.id === 'coastal-zones')?.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Button>
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
                  {studyItems.find(item => item.id === 'definitions')?.completed && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleStudyItem('definitions')
                  }}
                >
                  {studyItems.find(item => item.id === 'definitions')?.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Button>
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
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Label Earth's layers (crust, mantle, core)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Explain difference between oceanic and continental crust</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>List THREE types of plate boundaries and their features</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Provide evidence for plate tectonics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Define subduction zone</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Name THREE types of weathering</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Explain difference between weathering and erosion</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Calculate tidal range (High tide - Low tide)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Explain difference between spring and neap tides</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Describe Coriolis effect</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Compare surface currents vs deep currents</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Define upwelling and explain its importance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Describe El Niño conditions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Define littoral zone</span>
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
