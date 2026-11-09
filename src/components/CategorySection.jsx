import { categories } from '../data/products.js'

export default function CategorySection({ onSelectCategory, activeCategory }) {
  return (
    <section className="content-section category-section" id="categories">
      <div className="section-heading category-heading">
        <div>
          <p className="eyebrow">FIND YOUR NEXT FAVOURITE</p>
          <h2>Shop by category</h2>
        </div>
        <p className="section-side-note">A little something for every ritual.</p>
      </div>

      <div className="category-grid">
        {categories.map((category, index) => (
          <button
            type="button"
            className={`category-card ${activeCategory === category.id ? 'is-selected' : ''}`}
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            aria-pressed={activeCategory === category.id}
          >
            <span className="category-image-wrap">
              <img src={category.image} alt="" loading="lazy" />
              <span className="category-number">0{index + 1}</span>
            </span>
            <span className="category-title">{category.label}</span>
            <span className="category-note">{category.note}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
