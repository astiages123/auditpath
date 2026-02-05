import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import RootLayout from '@/shared/components/layout/RootLayout'
import Home from '@/app/routes/Home'
import { AuthGuard } from '@/features/auth'
import { Loader2 } from 'lucide-react'

// Lazy load non-critical pages for better initial bundle size
const Achievements = lazy(() => import('@/app/routes/Achievements'))
const Statistics = lazy(() => import('@/app/routes/Statistics'))
const EfficiencyPage = lazy(() => import('@/features/efficiency/EfficiencyPage'))
const NotesPage = lazy(() => import('@/app/routes/Notes'))


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
                    <Route path="/efficiency" element={<AuthGuard><EfficiencyPage /></AuthGuard>} />

                    <Route path="/notes/:courseSlug" element={<AuthGuard><NotesPage /></AuthGuard>} />
                    
                    {/* Redirect unknown routes to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </RootLayout>
    )
}

export default App
