import { useState } from 'react'
import Icon from './Icon.jsx'

export default function Footer({ onNavigateHomeSection, onShop }) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (email.trim()) setSubscribed(true)
  }

  return (
    <footer className="site-footer" id="footer">
      <div className="footer-main">
        <div className="footer-brand">
          <a className="footer-wordmark" href="#top">LUME</a>
          <span className="footer-submark">B E A U T Y</span>
          <p>A curated world of beauty.</p>
        </div>
        <div className="footer-column">
          <h3>Explore</h3>
          <a href="#shop" onClick={(event) => { event.preventDefault(); onShop?.() }}>Shop all</a>
          <a href="#best-sellers" onClick={(event) => { event.preventDefault(); onNavigateHomeSection?.('best-sellers') }}>Best sellers</a>
          <a href="#new-arrivals" onClick={(event) => { event.preventDefault(); onNavigateHomeSection?.('new-arrivals') }}>New in</a>
          <a href="#shop" onClick={(event) => { event.preventDefault(); onShop?.() }}>Brands</a>
        </div>
        <div className="footer-column">
          <h3>About Lume</h3>
          <a href="#our-story" onClick={(event) => { event.preventDefault(); onNavigateHomeSection?.('our-story') }}>Our story</a>
          <a href="#our-story" onClick={(event) => { event.preventDefault(); onNavigateHomeSection?.('our-story') }}>Our approach</a>
          <a href="#footer">Journal</a>
          <a href="#footer">Contact</a>
        </div>
        <div className="footer-column">
          <h3>Customer care</h3>
          <a href="#footer">Delivery</a>
          <a href="#footer">Returns</a>
          <a href="#footer">FAQs</a>
          <a href="#footer">Help & support</a>
        </div>
        <div className="newsletter-column">
          <h3>Notes from Lume</h3>
          <p>New discoveries, thoughtful edits and the occasional little treat.</p>
          {subscribed ? (
            <div className="subscribed-message"><Icon name="check" size={17} /> Thank you — you are on the list.</div>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="newsletter-email">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Your email address"
              />
              <button type="submit" aria-label="Subscribe to newsletter"><Icon name="arrow" size={18} /></button>
            </form>
          )}
          <a className="social-link" href="#footer" aria-label="Instagram"><Icon name="instagram" size={18} /></a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Lume Beauty. A concept retail project.</span>
        <div><a href="#footer">Privacy</a><a href="#footer">Terms</a><a href="#footer">Cookies</a></div>
      </div>
    </footer>
  )
}
