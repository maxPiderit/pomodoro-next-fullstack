'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { PaperclipIcon, ArrowLeftIcon } from 'lucide-react'

type Question = {
  question: string;
  options: string[];
  correctAnswer: number;
}

const questions: Question[] = [
  {
    question: "¿Cuál es la capital de Francia?",
    options: ["Londres", "Berlín", "Madrid", "París", "Roma"],
    correctAnswer: 3
  },
  {
    question: "¿En qué año comenzó la Segunda Guerra Mundial?",
    options: ["1935", "1939", "1941", "1945", "1950"],
    correctAnswer: 1
  },
  {
    question: "¿Cuál es el elemento químico más abundante en el universo?",
    options: ["Oxígeno", "Carbono", "Hidrógeno", "Helio", "Nitrógeno"],
    correctAnswer: 2
  },
  {
    question: "¿Quién pintó 'La noche estrellada'?",
    options: ["Pablo Picasso", "Claude Monet", "Salvador Dalí", "Vincent van Gogh", "Leonardo da Vinci"],
    correctAnswer: 3
  },
  {
    question: "¿Cuál es el planeta más grande del sistema solar?",
    options: ["Marte", "Venus", "Saturno", "Júpiter", "Neptuno"],
    correctAnswer: 3
  }
]

export function Page() {
  const [workTime, setWorkTime] = useState(30)
  const [shortBreakTime, setShortBreakTime] = useState(12)
  const [longBreakTime, setLongBreakTime] = useState(30)
  const [cyclesBeforeLongBreak, setCyclesBeforeLongBreak] = useState(3)
  const [currentCycle, setCurrentCycle] = useState(1)
  const [timeLeft, setTimeLeft] = useState(workTime * 60)
  const [isActive, setIsActive] = useState(false)
  const [mode, setMode] = useState<'work' | 'short-break' | 'long-break'>('work')
  const [showModal, setShowModal] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [questionTimer, setQuestionTimer] = useState(20)
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false)
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null))
  const [modalColor, setModalColor] = useState<'default' | 'correct' | 'incorrect'>('default')
  const [showLanding, setShowLanding] = useState(true)
  const [userNotes, setUserNotes] = useState('')

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const tick = useCallback(() => {
    const now = Date.now()
    const elapsed = Math.floor((now - startTimeRef.current) / 1000)
    const newTimeLeft = Math.max(0, timeLeft - elapsed)

    if (newTimeLeft === 0) {
      setIsActive(false)
      clearInterval(intervalRef.current!)
      playAlarm()
      if (mode === 'work') {
        setShowModal(true)
      } else {
        handleNextCycle()
      }
    } else {
      setTimeLeft(newTimeLeft)
    }
  }, [timeLeft, mode])

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now()
      intervalRef.current = setInterval(tick, 100)
    } else if (!isActive && intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isActive, tick])

  useEffect(() => {
    let questionInterval: NodeJS.Timeout | null = null

    if (showModal && !quizCompleted) {
      questionInterval = setInterval(() => {
        if (questionTimer > 0) {
          setQuestionTimer(questionTimer - 1)
        } else {
          handleNextQuestion()
        }
      }, 1000)
    }

    return () => {
      if (questionInterval) clearInterval(questionInterval)
    }
  }, [showModal, questionTimer, quizCompleted])

  const toggleTimer = () => {
    setIsActive(!isActive)
  }

  const resetTimer = () => {
    setIsActive(false)
    if (mode === 'work') {
      setTimeLeft(workTime * 60)
    } else if (mode === 'short-break') {
      setTimeLeft(shortBreakTime * 60)
    } else {
      setTimeLeft(longBreakTime * 60)
    }
  }

  const handleNextCycle = () => {
    if (mode === 'work') {
      if (currentCycle === cyclesBeforeLongBreak) {
        setMode('long-break')
        setTimeLeft(longBreakTime * 60)
        setCurrentCycle(1)
      } else {
        setMode('short-break')
        setTimeLeft(shortBreakTime * 60)
        setCurrentCycle(currentCycle + 1)
      }
    } else {
      setMode('work')
      setTimeLeft(workTime * 60)
    }
    setIsActive(true)
  }

  const handleNextQuestion = () => {
    const newUserAnswers = [...userAnswers]
    newUserAnswers[currentQuestion] = selectedAnswer
    setUserAnswers(newUserAnswers)

    if (selectedAnswer === questions[currentQuestion].correctAnswer) {
      setCorrectAnswers(correctAnswers + 1)
      setModalColor('correct')
      playCorrectSound()
    } else {
      setModalColor('incorrect')
      playIncorrectSound()
    }

    setTimeout(() => {
      setModalColor('default')
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1)
        setSelectedAnswer(null)
        setQuestionTimer(20)
      } else {
        setQuizCompleted(true)
      }
    }, 1000)
  }

  const handleQuizComplete = () => {
    setShowModal(false)
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setCorrectAnswers(0)
    setQuizCompleted(false)
    setQuestionTimer(20)
    setShowCorrectAnswers(false)
    setUserAnswers(Array(questions.length).fill(null))
    handleNextCycle()
  }

  const handleWorkTimeChange = (value: number[]) => {
    setWorkTime(value[0])
    if (mode === 'work' && !isActive) {
      setTimeLeft(value[0] * 60)
    }
  }

  const handleShortBreakTimeChange = (value: number[]) => {
    setShortBreakTime(value[0])
    if (mode === 'short-break' && !isActive) {
      setTimeLeft(value[0] * 60)
    }
  }

  const handleLongBreakTimeChange = (value: number[]) => {
    setLongBreakTime(value[0])
    if (mode === 'long-break' && !isActive) {
      setTimeLeft(value[0] * 60)
    }
  }

  const handleCyclesBeforeLongBreakChange = (value: number[]) => {
    setCyclesBeforeLongBreak(value[0])
  }

  const playAlarm = () => {
    const audio = new Audio('/alarm.mp3')
    audio.play()
  }

  const playCorrectSound = () => {
    const audio = new Audio('/correct.mp3')
    audio.play()
  }

  const playIncorrectSound = () => {
    const audio = new Audio('/incorrect.mp3')
    audio.play()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Here you would typically send the file to your backend for processing
      // For now, we'll just log the file name
      console.log('File uploaded:', file.name)
    }
  }

  const handleStart = () => {
    setShowLanding(false)
  }

  const handleReturnToLanding = () => {
    setShowLanding(true)
    setIsActive(false)
    resetTimer()
    setCurrentCycle(1)
    setMode('work')
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  if (showLanding) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-4">
        <div className="max-w-4xl w-full bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-center mb-4">Aprende un 120% más en la U o el Colegio</h1>
          <p className="text-xl text-center mb-8">
            Siguiendo un método pomodoro, te hacemos preguntas generadas dinámicamente con inteligencia artificial, 
            en base a tus propios apuntes, logrando un mejor aprendizaje con respaldo científico sólido.
          </p>
          <div className="mb-6">
            <Textarea 
              placeholder="Pega tus apuntes aquí..." 
              className="w-full h-40 bg-gray-700 text-white border-gray-600"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-between items-center mb-8">
            <label htmlFor="file-upload" className="cursor-pointer bg-gray-700 hover:bg-gray-600 py-2 px-4 rounded-lg flex items-center">
              <PaperclipIcon className="mr-2" size={20} />
              O adjunta tus apuntes
              <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" />
            </label>
            <Button onClick={handleStart} size="lg" className="bg-green-500 hover:bg-green-600">
              Empezar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white relative">
      <Button
        onClick={handleReturnToLanding}
        className="absolute top-4 left-4"
        variant="outline"
        size="sm"
      >
        <ArrowLeftIcon className="mr-2 h-4 w-4" />
        Volver
      </Button>
      <Card className="w-[400px] bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-white">
            Pomodoro Timer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-6xl font-bold text-center mb-6 text-white">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="text-center mb-6">
            <span className={`text-lg font-semibold ${
              mode === 'work' ? 'text-red-400' : 
              mode === 'short-break' ? 'text-green-400' : 
              'text-green-400'
            }`}>
              {mode === 'work' ? 'Work' : mode === 'short-break' ? 'Short Break' : 'Long Break'}
            </span>
            <p className="text-sm text-gray-400">Cycle: {currentCycle} / {cyclesBeforeLongBreak}</p>
          </div>
          <div className="mb-4">
            <Label htmlFor="work-time" className="text-gray-300">Tiempo de trabajo (minutos)</Label>
            <Slider
              id="work-time"
              min={1}
              max={60}
              step={1}
              value={[workTime]}
              onValueChange={handleWorkTimeChange}
              className="mt-2"
            />
            <div className="text-center mt-1 text-gray-300">{workTime} minutos</div>
          </div>
          <div className="mb-4">
            <Label htmlFor="short-break-time" className="text-gray-300">Tiempo de descanso corto (minutos)</Label>
            <Slider
              id="short-break-time"
              min={1}
              max={30}
              step={1}
              value={[shortBreakTime]}
              onValueChange={handleShortBreakTimeChange}
              className="mt-2"
            />
            <div className="text-center mt-1 text-gray-300">{shortBreakTime} minutos</div>
          </div>
          <div className="mb-4">
            <Label htmlFor="long-break-time" className="text-gray-300">Tiempo de descanso largo (minutos)</Label>
            <Slider
              id="long-break-time"
              min={1}
              max={60}
              step={1}
              value={[longBreakTime]}
              onValueChange={handleLongBreakTimeChange}
              className="mt-2"
            />
            <div className="text-center mt-1 text-gray-300">{longBreakTime} minutos</div>
          </div>
          <div className="mb-4">
            <Label htmlFor="cycles" className="text-gray-300">Ciclos antes del descanso largo</Label>
            <Slider
              id="cycles"
              min={1}
              max={10}
              step={1}
              value={[cyclesBeforeLongBreak]}
              onValueChange={handleCyclesBeforeLongBreakChange}
              className="mt-2"
            />
            <div className="text-center mt-1 text-gray-300">{cyclesBeforeLongBreak} ciclos</div>
          </div>
          <div className="flex justify-center space-x-4">
            <Button onClick={toggleTimer} variant={isActive ? "destructive" : "default"} className={isActive ? "" : "bg-green-500 hover:bg-green-600"}>
              {isActive ? 'Pausar' : 'Empezar'}
            </Button>
            <Button onClick={resetTimer} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">Reiniciar</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className={`bg-gray-800 text-white rounded-lg transition-colors duration-300 ${
          modalColor === 'correct' ? 'bg-green-700' :
          modalColor === 'incorrect' ? 'bg-red-700' :
          ''
        }`}>
          {!quizCompleted ?
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Pregunta {currentQuestion + 1} de 5</DialogTitle>
                <DialogDescription className="text-gray-300">
                  {questions[currentQuestion].question}
                </DialogDescription>
              </DialogHeader>
              <Progress value={(questionTimer / 20) * 100} className="w-full bg-gray-600" />
              <RadioGroup value={selectedAnswer?.toString()} onValueChange={(value) => setSelectedAnswer(parseInt(value))}>
                {questions[currentQuestion].options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} className="border-gray-500" />
                    <Label htmlFor={`option-${index}`} className="text-gray-300">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
              <DialogFooter>
                <Button onClick={handleNextQuestion} className="bg-green-500 hover:bg-green-600">
                  {currentQuestion < questions.length - 1 ? 'Siguiente' : 'Finalizar'}
                </Button>
              </DialogFooter>
            </>
            :
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Quiz Completado</DialogTitle>
                <DialogDescription className="text-gray-300">
                  Has respondido correctamente {correctAnswers} de 5 preguntas.
                </DialogDescription>
              </DialogHeader>
              {showCorrectAnswers && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2 text-white">Respuestas correctas:</h3>
                  {questions.map((q, index) => (
                    <div key={index} className="mb-2">
                      <p className="font-medium text-white">{q.question}</p>
                      <p className={userAnswers[index] === q.correctAnswer ? "text-green-400" : "text-red-400"}>
                        Respuesta correcta: {q.options[q.correctAnswer]}
                      </p>
                      {userAnswers[index] !== null && userAnswers[index] !== q.correctAnswer && (
                        <p className="text-red-400">
                          Tu respuesta: {q.options[userAnswers[index]!]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setShowCorrectAnswers(!showCorrectAnswers)} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  {showCorrectAnswers ? 'Ocultar respuestas' : 'Ver respuestas correctas'}
                </Button>
                <Button onClick={handleQuizComplete} className="bg-green-500 hover:bg-green-600">Comenzar Siguiente Ciclo</Button>
              </DialogFooter>
            </>
          }
        </DialogContent>
      </Dialog>
    </div>
  )
}