import { Link } from 'react-router-dom'
import { useSeo, pageSeo } from '../lib/seo.js'

export default function NotFound() {
  useSeo({ ...pageSeo('notFound'), noindex: true })
  return (
    <section className="not-found">
      <div className="glow glow--violet" style={{ width: 500, height: 500, top: '20%', left: '30%' }} />
      <div className="container not-found__inner">
        <h1 className="display gradient-text">404</h1>
        <p className="lead">Такой страницы нет — но удовольствие всё ещё рядом.</p>
        <Link to="/" className="btn btn--primary">На главную</Link>
      </div>
    </section>
  )
}
