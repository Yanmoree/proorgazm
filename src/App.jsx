import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useEffect } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import AgeGate from './components/AgeGate.jsx'
import FloatingBook from './components/FloatingBook.jsx'
import CookieBanner from './components/CookieBanner.jsx'
import Privacy from './pages/Privacy.jsx'
import Home from './pages/Home.jsx'
import Massages from './pages/Massages.jsx'
import MassagePage from './pages/MassagePage.jsx'
import Masters from './pages/Masters.jsx'
import MasterPage from './pages/MasterPage.jsx'
import Reviews from './pages/Reviews.jsx'
import Contacts from './pages/Contacts.jsx'
import Blog from './pages/Blog.jsx'
import ArticlePage from './pages/ArticlePage.jsx'
import NotFound from './pages/NotFound.jsx'
import { ContentProvider } from './lib/content.jsx'
import { startSmoothScroll, scrollToTop } from './lib/smooth.js'
import { trackPageview, listenOutbound } from './lib/track.js'
import { legacyRedirect } from './lib/routes.js'

// Админка — отдельный чанк, на публичный сайт не грузится
const Admin = lazy(() => import('./admin/Admin.jsx'))

function Page({ children }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.main>
  )
}

function Site() {
  const location = useLocation()
  const redirect = legacyRedirect(location.pathname)

  useEffect(() => {
    const stopScroll = startSmoothScroll()
    const stopOutbound = listenOutbound()
    return () => { stopScroll(); stopOutbound() }
  }, [])

  useEffect(() => {
    scrollToTop()
    trackPageview()
  }, [location.pathname])

  if (redirect) return <Navigate to={redirect.includes('?') ? redirect : redirect + location.search} replace />

  return (
    <ContentProvider>
      <AgeGate />
      <Header />
      <AnimatePresence mode="wait" onExitComplete={scrollToTop}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Page><Home /></Page>} />
          <Route path="/massages" element={<Page><Massages /></Page>} />
          <Route path="/massages/:slug" element={<Page><MassagePage /></Page>} />
          <Route path="/masters" element={<Page><Masters /></Page>} />
          <Route path="/masters/:slug" element={<Page><MasterPage /></Page>} />
          <Route path="/reviews" element={<Page><Reviews /></Page>} />
          <Route path="/contacts" element={<Page><Contacts /></Page>} />
          <Route path="/blog" element={<Page><Blog /></Page>} />
          <Route path="/blog/:slug" element={<Page><ArticlePage /></Page>} />
          <Route path="/privacy" element={<Page><Privacy /></Page>} />
          <Route path="*" element={<Page><NotFound /></Page>} />
        </Routes>
      </AnimatePresence>
      <Footer />
      <FloatingBook />
      <CookieBanner />
    </ContentProvider>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Suspense fallback={null}><Admin /></Suspense>} />
      <Route path="*" element={<Site />} />
    </Routes>
  )
}
