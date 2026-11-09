import Icon from './Icon.jsx'
import storyImage from '../assets/brand-story.jpg'

export default function BrandStory() {
  return (
    <section className="brand-story" id="our-story">
      <div className="story-image">
        <img src={storyImage} alt="Soft ivory botanical petals with delicate water droplets" loading="lazy" />
      </div>
      <div className="story-copy">
        <p className="eyebrow">A LITTLE ABOUT US</p>
        <h2>A more considered approach to beauty.</h2>
        <p>
          We bring together thoughtful beauty brands and everyday essentials,
          making it easier to discover products you will come back to.
        </p>
        <a className="outline-link" href="#footer">Discover our story <Icon name="arrow" size={16} /></a>
      </div>
    </section>
  )
}
