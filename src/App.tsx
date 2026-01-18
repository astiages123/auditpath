import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import RootLayout from '@/components/layout/RootLayout'
import Home from '@/pages/Home'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Loader2 } from 'lucide-react'

// Lazy load non-critical pages for better initial bundle size
const Achievements = lazy(() => import('@/pages/Achievements'))
const NotePage = lazy(() => import('@/pages/NotePage'))
const Statistics = lazy(() => import('@/pages/Statistics'))

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
                    <Route path="/notes/:slug" element={<AuthGuard><NotePage /></AuthGuard>} />
                    <Route path="/statistics" element={<AuthGuard><Statistics /></AuthGuard>} />
                </Routes>
            </Suspense>
        </RootLayout>
    )
}

export default App
