import { photos, photoUrl } from '../content/photos'

export function CreditsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="credits-screen">
      <header>
        <button onClick={onBack}>◀ Back</button>
        <h1>Photo credits</h1>
      </header>
      <p className="note">
        All photos come from Wikimedia Commons and are used under their free licenses. They were resized and cropped to squares for the game.
        The font is Fredoka (SIL Open Font License). The game engine is Phaser (MIT License).
      </p>
      <ul className="credits">
        {photos.map((p) => (
          <li key={p.id}>
            <img src={photoUrl(p)} alt="" loading="lazy" />
            <div>
              <a href={p.source} target="_blank" rel="noreferrer">
                {p.title}
              </a>
              <span>by {p.author}</span>
              <span>
                {p.licenseUrl ? (
                  <a href={p.licenseUrl} target="_blank" rel="noreferrer">
                    {p.license}
                  </a>
                ) : (
                  p.license
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
