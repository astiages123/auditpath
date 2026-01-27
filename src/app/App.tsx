import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import RootLayout from '@/shared/components/layout/RootLayout'
import Home from '@/app/routes/Home'
import { AuthGuard } from '@/features/auth'
import { Loader2 } from 'lucide-react'

// Lazy load non-critical pages for better initial bundle size
const Achievements = lazy(() => import('@/app/routes/Achievements'))
const Statistics = lazy(() => import('@/app/routes/Statistics'))
const Settings = lazy(() => import('@/app/routes/Settings'))
const NotesPage = lazy(() => import('@/pages/notes/NotesPage'))


// Loading fallback component
function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )
}

function App() {
    return (
        <RootLayout>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
                    <Route path="/achievements" element={<AuthGuard><Achievements /></AuthGuard>} />
                    <Route path="/statistics" element={<AuthGuard><Statistics /></AuthGuard>} />
                    <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
                    <Route path="/notes/:courseId" element={<AuthGuard><NotesPage /></AuthGuard>} />

                </Routes>
            </Suspense>
        </RootLayout>
    )
}

export default App
