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
import { PaperclipIcon, ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon, VolumeXIcon, Volume2Icon, XCircleIcon } from 'lucide-react'
import mammoth from 'mammoth'
import { pdfjs } from 'react-pdf'

// Inicializar pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

type Question = {
  question: string;
  options: string[];
  correctAnswer: number;
}

export default function PomodoroApp() {
  const [workTime, setWorkTime] = useState(30)
  const [shortBreakTime, setShortBreakTime] = useState(12)
  const [longBreakTime, setLongBreakTime] = useState(30)
  const [cyclesBeforeLongBreak, setCyclesBeforeLongBreak] = useState(3)
  const [currentCycle, setCurrentCycle] = useState(1)
  const [timeLeft, setTimeLeft] = useState(workTime * 60)
  const [isActive, setIsActive] = useState(false)
  const [mode, setMode] = useState<'idle' | 'work' | 'short-break' | 'long-break'>('idle')
  const [showModal, setShowModal] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [questionTimer, setQuestionTimer] = useState(20)
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false)
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([])
  const [modalColor, setModalColor] = useState<'default' | 'correct' | 'incorrect'>('default')
  const [showLanding, setShowLanding] = useState(true)
  const [userNotes, setUserNotes] = useState('')
  const [optionsCollapsed, setOptionsCollapsed] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [validUploadedFiles, setValidUploadedFiles] = useState<File[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [duplicateFiles, setDuplicateFiles] = useState<string[]>([])
  const alarmRef = useRef<HTMLAudioElement | null>(null)
  const [timerStarted, setTimerStarted] = useState(false)

  // Agregar una nueva variable de estado
  const [questionsGenerated, setQuestionsGenerated] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const tick = useCallback(() => {
    const now = Date.now()
    const elapsed = Math.floor((now - startTimeRef.current) / 1000)
    const newTimeLeft = Math.max(0, timeLeft - elapsed)

    // Si quedan 35 segundos y estamos en modo 'work' y aún no hemos generado preguntas
    if (newTimeLeft === 35 && mode === 'work' && !questionsGenerated) {
      generateQuestions(userNotes)
      setQuestionsGenerated(true) // Evitar llamadas múltiples
    }

    if (newTimeLeft === 0) {
      setIsActive(false)
      clearInterval(intervalRef.current!)
      playAlarm() // Reproducir la alarma al finalizar cualquier período
      console.log('Intentando reproducir alarma') // Agregar este log
      if (mode === 'work') {
        setShowModal(true)
      } else {
        handleNextCycle()
      }
      // Reiniciar el indicador para el próximo ciclo
      setQuestionsGenerated(false)
    } else {
      setTimeLeft(newTimeLeft)
    }
  }, [timeLeft, mode, userNotes, questionsGenerated])

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
    if (!isActive) {
      if (!isPaused) {
        setMode('work')
        setTimeLeft(workTime * 60)
      }
      setOptionsCollapsed(true)
      setTimerStarted(true) // Añadir esta línea
    } else {
      setIsPaused(true)
    }
    setIsActive(!isActive)
  }

  const toggleOptions = () => {
    setOptionsCollapsed(!optionsCollapsed)
  }

  const resetTimer = () => {
    setIsActive(false)
    setIsPaused(false)
    setMode('idle')
    setTimeLeft(workTime * 60)
    setCurrentCycle(1)
    setOptionsCollapsed(false)
    setTimerStarted(false) // Añadir esta línea
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
    setQuestionsGenerated(false) // Restablecer este estado para el próximo ciclo
  }

  const handleNextQuestion = () => {
    if (questions.length === 0 || currentQuestion >= questions.length) {
      console.error('No hay preguntas disponibles o se ha llegado al final del cuestionario')
      return
    }

    const newUserAnswers = [...userAnswers]
    newUserAnswers[currentQuestion] = selectedAnswer
    setUserAnswers(newUserAnswers)

    if (selectedAnswer === questions[currentQuestion].correctAnswer) {
      setCorrectAnswers(prevCorrectAnswers => prevCorrectAnswers + 1)
      setModalColor('correct')
      playCorrectSound()
    } else {
      setModalColor('incorrect')
      playIncorrectSound()
    }

    setTimeout(() => {
      setModalColor('default')
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prevCurrentQuestion => prevCurrentQuestion + 1)
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
    setUserAnswers([])
    setQuestions([]) // Vaciar el estado de las preguntas
    handleNextCycle()
  }

  const handleWorkTimeChange = (value: number[]) => {
    setWorkTime(value[0])
    if (mode === 'idle' || (mode === 'work' && !isActive)) {
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
    if (!isMuted) {
      const audio = new Audio('/alarm.wav')
      audio.loop = true // Hacer que la alarma se repita
      audio.play().catch(error => console.error('Error al reproducir el audio:', error))
      alarmRef.current = audio
      setIsAlarmPlaying(true)
      
      // Ocultar el botón de detener alarma después de 10 segundos
      setTimeout(() => {
        setIsAlarmPlaying(false)
        if (alarmRef.current) {
          alarmRef.current.pause()
          alarmRef.current.currentTime = 0
        }
      }, 10000)
    }
  }

  const stopAlarm = () => {
    if (alarmRef.current) {
      alarmRef.current.pause()
      alarmRef.current.currentTime = 0
    }
    setIsAlarmPlaying(false)
  }

  const playCorrectSound = () => {
    if (!isMuted) {
      const audio = new Audio('/correct.mp3')
      audio.play()
    }
  }

  const playIncorrectSound = () => {
    if (!isMuted) {
      const audio = new Audio('/incorrect.mp3')
      audio.play()
    }
  }

  const isFileDuplicate = (file: File, existingFiles: File[]): boolean => {
    return existingFiles.some(existingFile => 
      existingFile.name === file.name && existingFile.size === file.size && existingFile.lastModified === file.lastModified
    );
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let files: FileList | null = null
    if (event.type === 'change') {
      files = (event as React.ChangeEvent<HTMLInputElement>).target.files
    } else if (event.type === 'drop') {
      files = (event as React.DragEvent<HTMLDivElement>).dataTransfer.files
    }

    if (files && files.length > 0) {
      setUploadError(null)
      setDuplicateFiles([])
      const newFiles = Array.from(files)
      const uniqueNewFiles = newFiles.filter(file => !isFileDuplicate(file, uploadedFiles))
      const duplicates = newFiles.filter(file => isFileDuplicate(file, uploadedFiles))

      if (duplicates.length > 0) {
        setDuplicateFiles(duplicates.map(file => file.name))
      }

      let allContent = ''
      let errorOccurred = false

      const processedFiles = await Promise.all(uniqueNewFiles.map(async (file) => {
        try {
          const content = await readFileContent(file)
          allContent += content + '\n\n'
          return file
        } catch (error) {
          console.error('Error al procesar el archivo:', error)
          setUploadError(prevError => 
            prevError 
              ? `${prevError}\nError al procesar ${file.name}. Se omitirá este archivo.` 
              : `Error al procesar ${file.name}. Se omitirá este archivo.`
          )
          errorOccurred = true
          return null
        }
      }))

      const validFiles = processedFiles.filter((file): file is File => file !== null)

      setUploadedFiles(prevFiles => [...prevFiles, ...uniqueNewFiles])
      setValidUploadedFiles(prevFiles => [...prevFiles, ...validFiles])

      if (allContent.trim()) {
        setUserNotes(prevNotes => prevNotes + allContent)
      }

      if (errorOccurred) {
        alert('Algunos archivos no se pudieron procesar y se omitieron. Revisa los mensajes de error para más detalles.')
      }

      if (duplicates.length > 0) {
        alert(`Se detectaron ${duplicates.length} archivo(s) duplicado(s) y se ignoraron: ${duplicates.map(f => f.name).join(', ')}`)
      }
    }
  }

  const readFileContent = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
      return await readPdfContent(file)
    } else {
      return await readDocxOrTxtContent(file)
    }
  }

  const readPdfContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (event) => {
        if (event.target) {
          const typedarray = new Uint8Array(event.target.result as ArrayBuffer)
          try {
            const pdf = await pdfjs.getDocument({ data: typedarray }).promise
            let content = ''
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i)
              const textContent = await page.getTextContent()
              content += textContent.items.map((item: any) => item.str).join(' ') + '\n'
            }
            resolve(content)
          } catch (error) {
            console.error('Error al leer el archivo PDF:', error)
            reject(new Error('Error al leer el archivo PDF'))
          }
        } else {
          reject(new Error('Error al leer el archivo'))
        }
      }
      reader.onerror = (error) => reject(error)
      reader.readAsArrayBuffer(file)
    })
  }

  const readDocxOrTxtContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (event) => {
        if (event.target) {
          const arrayBuffer = event.target.result as ArrayBuffer
          try {
            const result = await mammoth.extractRawText({ arrayBuffer })
            resolve(result.value)
          } catch (error) {
            reject(error)
          }
        } else {
          reject(new Error('Error al leer el archivo'))
        }
      }
      reader.onerror = (error) => reject(error)
      reader.readAsArrayBuffer(file)
    })
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    handleFileUpload(event)
  }

  const generateQuestions = async (content: string) => {
    setIsLoadingQuestions(true)
    try {
      const response = await fetch('/api/external', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error('Error al generar preguntas')
      }

      const data = await response.json()
      console.log('Respuesta del servidor:', data)
      if (data.questions) {
        const parsedQuestions = JSON.parse(data.questions)
        console.log('Preguntas generadas:', parsedQuestions)
        setQuestions(parsedQuestions)
        setUserAnswers(Array(parsedQuestions.length).fill(null))
        setCurrentQuestion(0)
        setQuizCompleted(false)
        setCorrectAnswers(0)
      } else {
        throw new Error('No se recibieron preguntas del servidor')
      }
    } catch (error) {
      console.error('Error al generar preguntas:', error)
    } finally {
      setIsLoadingQuestions(false)
    }
  }

  const handleStart = () => {
    if (uploadedFiles.length === 0 || userNotes.trim() === '') {
      setUploadError('Por favor, sube al menos un archivo válido antes de comenzar.')
      return
    }
    setShowLanding(false)
    setMode('idle')
    setTimeLeft(workTime * 60)
    setIsActive(false)
  }

  const handleReturnToLanding = () => {
    setShowLanding(true)
    setIsActive(false)
    resetTimer()
    setCurrentCycle(1)
    setMode('idle')
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const getBackgroundColor = () => {
    switch (mode) {
      case 'work':
        return 'bg-red-400';
      case 'short-break':
      case 'long-break':
        return 'bg-green-400';
      default:
        return 'bg-gray-900';
    }
  }

  if (showLanding) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-4">
        <div className="max-w-4xl w-full bg-gray-800 rounded-3xl shadow-xl p-8">
          <h1 className="text-5xl font-bold text-center mb-4">Aprende un 120% más en la U o el Colegio</h1>
          <p className="text-2xl text-center mb-8">
            Siguiendo un método pomodoro, te hacemos preguntas generadas dinámicamente con inteligencia artificial, 
            en base a tus propios apuntes, logrando un mejor aprendizaje con respaldo científico sólido.
          </p>
          <div 
            className="mb-6 border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer flex flex-col justify-center items-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              onChange={handleFileUpload} 
              accept=".pdf,.doc,.docx,.txt" 
              multiple
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <PaperclipIcon className="mb-4" size={48} />
              <p className="text-2xl mb-2">Arrastra tus apuntes aquí o haz clic para seleccionar archivos</p>
              <div className="mt-2">
                {validUploadedFiles.length > 0 && (
                  <div className="text-green-400 text-2xl">
                    <p>{validUploadedFiles.length} archivo{validUploadedFiles.length > 1 ? 's' : ''} subido{validUploadedFiles.length > 1 ? 's' : ''} válidamente:</p>
                    <ul className="list-disc list-inside">
                      {validUploadedFiles.map((file, index) => (
                        <li key={index}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {duplicateFiles.length > 0 && (
                  <p className="text-red-400 text-2xl">
                    {duplicateFiles.length} archivo{duplicateFiles.length > 1 ? 's' : ''} duplicado{duplicateFiles.length > 1 ? 's' : ''} ignorado{duplicateFiles.length > 1 ? 's' : ''}: {duplicateFiles.join(', ')}
                  </p>
                )}
                {uploadError && (
                  <p className="text-red-400 text-2xl">{uploadError}</p>
                )}
              </div>
            </label>
          </div>
          <div className="flex justify-center mb-8">
            <Button onClick={handleStart} size="lg" className="w-full sm:w-auto bg-green-500 hover:bg-green-600 rounded-xl">
              Empezar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center min-h-screen text-white relative ${getBackgroundColor()}`}>
      <Button
        onClick={handleReturnToLanding}
        className="absolute top-4 left-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-2xl py-6"
        variant="ghost"
        size="sm"
      >
        <ArrowLeftIcon className="mr-2 h-6 w-6" />
        Volver
      </Button>
      <Button
        onClick={toggleMute}
        className="absolute top-4 right-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-2xl py-6"
        variant="ghost"
        size="sm"
      >
        {isMuted ? <VolumeXIcon className="h-6 w-6" /> : <Volume2Icon className="h-6 w-6" />}
      </Button>
      <Card className="w-[400px] md:w-[800px] bg-gray-800 border-gray-700 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-5xl font-bold text-center text-white">
            Pomodoro Timer
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timerStarted ? (
            <>
              <div className="text-8xl font-bold text-center mb-6 text-white">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="text-center mb-6">
                <span className={`text-5xl font-bold ${
                  mode === 'work' ? 'text-red-400' : 
                  mode === 'short-break' ? 'text-green-400' : 
                  mode === 'long-break' ? 'text-green-400' :
                  'text-gray-400'
                }`}>
                  {mode === 'work' ? 'Estudio' : 
                   mode === 'short-break' ? 'Descanso' : 
                   mode === 'long-break' ? 'Descanso largo' :
                   'Listo para comenzar'
                  }
                </span>
              </div>
              <Button 
                onClick={toggleOptions} 
                variant="ghost" 
                className="w-full mb-4 text-gray-300 hover:bg-gray-700 text-2xl py-6"
              >
                {optionsCollapsed ? <ChevronDownIcon className="mr-2 h-6 w-6" /> : <ChevronUpIcon className="mr-2 h-6 w-6" />}
                {optionsCollapsed ? 'Mostrar opciones' : 'Ocultar opciones'}
              </Button>
            </>
          ) : (
            <div className="text-center mb-6">
              <span className="text-5xl font-bold text-gray-400">
                Listo para comenzar
              </span>
            </div>
          )}
          <p className="text-2xl text-gray-300 mb-4 text-center">Ciclo: {currentCycle} / {cyclesBeforeLongBreak}</p>
          <div className={`transition-all duration-100 ${optionsCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-[1000px]'}`}>
            <div className="mb-4">
              <Label htmlFor="work-time" className="text-gray-300 text-2xl">
                Tiempo de trabajo<br />(minutos)
              </Label>
              <Slider
                id="work-time"
                min={1}
                max={60}
                step={1}
                value={[workTime]}
                onValueChange={handleWorkTimeChange}
                className="mt-2"
              />
              <div className="text-center mt-1 text-gray-300 text-2xl">{workTime} minutos</div>
            </div>
            <div className="mb-4">
              <Label htmlFor="short-break-time" className="text-gray-300 text-2xl">
                Tiempo de descanso<br />corto (minutos)
              </Label>
              <Slider
                id="short-break-time"
                min={1}
                max={30}
                step={1}
                value={[shortBreakTime]}
                onValueChange={handleShortBreakTimeChange}
                className="mt-2"
              />
              <div className="text-center mt-1 text-gray-300 text-2xl">{shortBreakTime} minutos</div>
            </div>
            <div className="mb-4">
              <Label htmlFor="long-break-time" className="text-gray-300 text-2xl">
                Tiempo de descanso<br />largo (minutos)
              </Label>
              <Slider
                id="long-break-time"
                min={1}
                max={60}
                step={1}
                value={[longBreakTime]}
                onValueChange={handleLongBreakTimeChange}
                className="mt-2"
              />
              <div className="text-center mt-1 text-gray-300 text-2xl">{longBreakTime} minutos</div>
            </div>
            <div className="mb-4">
              <Label htmlFor="cycles" className="text-gray-300 text-2xl">
                Ciclos antes del descanso<br />largo
              </Label>
              <Slider
                id="cycles"
                min={1}
                max={10}
                step={1}
                value={[cyclesBeforeLongBreak]}
                onValueChange={handleCyclesBeforeLongBreakChange}
                className="mt-2"
              />
              <div className="text-center mt-1 text-gray-300 text-2xl">{cyclesBeforeLongBreak} ciclos</div>
            </div>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            <Button 
              onClick={resetTimer} 
              variant="outline" 
              className="border-gray-600 text-gray-600 hover:bg-gray-700 rounded-xl text-2xl px-6 py-6"
            >
              Reiniciar
            </Button>
            <Button 
              onClick={toggleTimer} 
              variant={isActive ? "destructive" : "default"} 
              className={`${isActive ? "" : "bg-green-500 hover:bg-green-600"} rounded-xl text-2xl px-6 py-6`}
            >
              {isActive ? 'Pausar' : 'Empezar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className={`bg-gray-800 text-white rounded-3xl transition-colors duration-300 ${
          modalColor === 'correct' ? 'bg-green-700' :
          modalColor === 'incorrect' ? 'bg-red-700' :
          ''
        }`}>
          {isLoadingQuestions ? (
            <div className="text-center">
              <p className="text-2xl">Generando preguntas...</p>
            </div>
          ) : !quizCompleted && questions.length > 0 ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-3xl text-white">Pregunta {currentQuestion + 1} de {questions.length}</DialogTitle>
                <DialogDescription className="text-2xl text-gray-300">
                  {questions[currentQuestion].question}
                </DialogDescription>
              </DialogHeader>
              <Progress value={(questionTimer / 20) * 100} className="w-full bg-gray-600" />
              <RadioGroup value={selectedAnswer !== null ? selectedAnswer.toString() : undefined} onValueChange={(value) => setSelectedAnswer(parseInt(value))}>
                {questions[currentQuestion].options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={index.toString()} 
                      id={`option-${index}`} 
                      className="border-gray-500 text-white"
                    />
                    <Label htmlFor={`option-${index}`} className="text-2xl text-gray-300">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
              <DialogFooter className="flex justify-center mt-4">
                <Button 
                  onClick={handleNextQuestion} 
                  className="bg-green-500 hover:bg-green-600 text-white rounded-xl text-2xl"
                >
                  Siguiente pregunta
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl sm:text-3xl text-white">Quiz Completado</DialogTitle>
                <DialogDescription className="text-lg sm:text-2xl text-gray-300">
                  Has respondido correctamente {correctAnswers} de {questions.length} preguntas.
                </DialogDescription>
              </DialogHeader>
              {showCorrectAnswers && (
                <div className="mt-4 max-h-60 overflow-y-auto">
                  <h3 className="font-semibold mb-2 text-xl sm:text-2xl text-white">Respuestas correctas:</h3>
                  {questions.map((q, index) => (
                    <div key={index} className="mb-2">
                      <p className="font-medium text-lg sm:text-xl text-white">{q.question}</p>
                      <p className={`text-lg sm:text-xl ${userAnswers[index] === q.correctAnswer ? "text-green-400" : "text-red-400"}`}>
                        Respuesta correcta: {q.options[q.correctAnswer]}
                      </p>
                      {userAnswers[index] !== null && userAnswers[index] !== q.correctAnswer && (
                        <p className="text-lg sm:text-xl text-red-400">
                          Tu respuesta: {q.options[userAnswers[index]!]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter className="flex flex-col sm:flex-row justify-center mt-4 space-y-2 sm:space-y-0 sm:space-x-2">
                <Button 
                  onClick={() => setShowCorrectAnswers(!showCorrectAnswers)} 
                  variant="outline" 
                  className="w-full sm:w-auto border-gray-600 text-gray-600 hover:bg-gray-700 hover:text-white rounded-xl text-lg sm:text-xl"
                >
                  {showCorrectAnswers ? 'Ocultar respuestas' : 'Ver respuestas correctas'}
                </Button>
                <Button 
                  onClick={handleQuizComplete} 
                  className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white rounded-xl text-lg sm:text-xl"
                >
                  Comenzar ciclo siguiente
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {isAlarmPlaying && !showModal && (
        <Button
          onClick={stopAlarm}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 hover:bg-blue-600 text-white text-2xl"
          size="sm"
        >
          <XCircleIcon className="mr-2 h-6 w-6" />
          Detener Alarma
        </Button>
      )}
    </div>
  )
}