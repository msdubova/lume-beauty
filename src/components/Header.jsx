import { useState } from 'react'
import Icon from './Icon.jsx'

export default function Header({ cartCount, wishlistCount, onSearch, onNavigate, onNavigateHomeSection, currentPage }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const submitSearch = (event) => {
    event.preventDefault()
    onSearch(searchTerm.trim())
    setSearchOpen(false)
    setMenuOpen(false)
  }

  const openSearch = () => {
    setSearchOpen((open) => !open)
    setMenuOpen(false)
  }

  const navigate = (target) => {
    setMenuOpen(false)
    setSearchOpen(false)
    onNavigate(target)
  }

  const goToSection = (section) => {
    setMenuOpen(false)
    setSearchOpen(false)
    onNavigateHomeSection(section)
  }

  return (
    <>
      <div className="announcement-bar">
        <span>Complimentary delivery on orders over £50</span>
        <span className="announcement-divider" aria-hidden="true">|</span>
        <span>Thoughtfully selected beauty</span>
        <span className="announcement-divider" aria-hidden="true">|</span>
        <span>Discover something lovely</span>
      </div>

      <header className="site-header">
        <button
          className="icon-button mobile-menu-trigger"
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => { setMenuOpen((open) => !open); setSearchOpen(false) }}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
        </button>

        <button className="brand-lockup brand-lockup-button" type="button" onClick={() => navigate('home')} aria-label="Lume Beauty home">
          <span className="brand-wordmark">LUME</span>
          <span className="brand-submark">B E A U T Y</span>
        </button>

        <nav className={`desktop-navigation ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <button type="button" className={currentPage === 'shop' ? 'is-active' : ''} onClick={() => navigate('shop')}>Shop <Icon name="chevron" size={13} /></button>
          <button type="button" onClick={() => goToSection('best-sellers')}>Best sellers</button>
          <button type="button" onClick={() => goToSection('new-arrivals')}>New in</button>
          <button type="button" onClick={() => goToSection('our-story')}>Our story</button>
        </nav>

        <div className="header-actions">
          <button className="icon-button" type="button" aria-label="Search products" onClick={openSearch}>
            <Icon name="search" />
          </button>
          <button className="icon-button account-action" type="button" aria-label="My account" onClick={() => navigate('account')}>
            <Icon name="user" />
          </button>
          <button className="icon-button wishlist-action" type="button" aria-label={`Wishlist, ${wishlistCount} items`} onClick={() => navigate('wishlist')}>
            <Icon name="heart" />
            {wishlistCount > 0 && <span className="action-count">{wishlistCount}</span>}
          </button>
          <button className="icon-button bag-action" type="button" aria-label={`Shopping bag, ${cartCount} items`} onClick={() => navigate('bag')}>
            <Icon name="bag" />
            <span className="action-count">{cartCount}</span>
          </button>
        </div>
      </header>

      {searchOpen && (
        <form className="search-panel" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="site-search">Search the Lume Beauty collection</label>
          <Icon name="search" />
          <input
            id="site-search"
            autoFocus
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search products, brands and rituals"
          />
          <button className="search-submit" type="submit">Search</button>
          <button className="icon-button search-close" type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}>
            <Icon name="close" size={18} />
          </button>
        </form>
      )}
    </>
  )
}
