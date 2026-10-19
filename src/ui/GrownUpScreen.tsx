import { levels } from '../content/levels'
import { standards as standardText } from '../content/standards'
import { accuracy } from '../quiz/mastery'
import { skills } from '../quiz/skills'
import { resetSave, useSave } from '../save'

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

export function GrownUpScreen({ onBack, onCredits }: { onBack: () => void; onCredits: () => void }) {
  const save = useSave()
  const cleared = levels.filter((l) => (save.levels[l.id]?.stars ?? 0) > 0).length
  return (
    <div className="grownup-screen">
      <header>
        <button onClick={onBack}>◀ Back</button>
        <h1>For grown-ups</h1>
        <button className="link" onClick={onCredits}>
          Photo credits
        </button>
      </header>
      <div className="summary">
        <div>
          <b>{formatTime(save.playSeconds)}</b>
          <span>played</span>
        </div>
        <div>
          <b>{save.quizzesAnswered}</b>
          <span>quiz questions</span>
        </div>
        <div>
          <b>
            {cleared}/{levels.length}
          </b>
          <span>levels cleared</span>
        </div>
      </div>
      <p className="note">
        Accuracy counts a question as correct only when it was answered on the first try. Questions are picked more often from skills with
        lower recent accuracy. Everything stays on this device; nothing is sent anywhere.
      </p>
      <table className="skills-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Standard</th>
            <th>Tried</th>
            <th>First-try accuracy</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((s) => {
            const rec = save.mastery[s.id]
            const acc = accuracy(save.mastery, s.id)
            return (
              <tr key={s.id}>
                <td>
                  <span className={`subject ${s.subject}`}>{s.subject === 'math' ? 'Math' : 'Science'}</span> {s.label}
                </td>
                <td>
                  {s.standards.map((code) => (
                    <abbr key={code} title={standardText[code]}>
                      {code}
                    </abbr>
                  ))}
                </td>
                <td>{rec?.seen ?? 0}</td>
                <td>
                  {acc === undefined ? (
                    <span className="muted">not yet</span>
                  ) : (
                    <span className="acc">
                      <span className="acc-bar" style={{ width: `${Math.round(acc * 100)}%` }} />
                      <span className="acc-num">{Math.round(acc * 100)}%</span>
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <button
        className="danger"
        onClick={() => {
          if (window.confirm('Erase all progress on this device?')) resetSave()
        }}
      >
        Reset all progress
      </button>
    </div>
  )
}
