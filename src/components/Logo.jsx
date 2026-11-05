import { Link } from 'react-router-dom'

export default function Logo({ onClick }) {
  return (
    <Link to="/" className="logo" onClick={onClick} aria-label="ProOrgazm — на главную">
      <img className="logo__mark" src="/images/logo-96.webp" alt="" width="44" height="44" />
      <span className="logo__text">
        Pro<span className="gradient-text">Orgazm</span>
      </span>
    </Link>
  )
}
