import { useEffect, useState } from 'react';
import { Dashboard } from './ui/Dashboard';
import { Practice } from './ui/Practice';
import { Review } from './ui/Review';
import { Session } from './ui/Session';
import { Settings } from './ui/Settings';
import { Subjects, type Focus } from './ui/Subjects';

type View =
  | { name: 'home' }
  | { name: 'review' }
  | { name: 'subjects'; focus?: Focus }
  | { name: 'session'; key: string }
  | { name: 'practice'; skillId: string; level: number }
  | { name: 'settings' };

/** Where to land in the outline after leaving a session. */
const focusOfKey = (key: string): Focus => {
  const [kind, id] = key.split(/:(.*)/s);
  return kind === 'skill' ? { section: id } : { chapter: id };
};

export function App() {
  const [view, setView] = useState<View>({ name: 'home' });
  const home = () => setView({ name: 'home' });
  const subjects = (focus?: Focus) => setView({ name: 'subjects', focus });
  const study = (key: string) => setView({ name: 'session', key });

  useEffect(() => {
    if (view.name !== 'subjects' || !view.focus) window.scrollTo(0, 0);
  }, [view]);

  const tab = view.name === 'home' || view.name === 'review' ? 'home' : view.name === 'settings' ? 'settings' : 'subjects';

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={home}>
          <span className="sigma">∑</span> mathdeck
        </button>
        <nav>
          <button className={tab === 'home' ? 'active' : ''} onClick={home}>
            Today
          </button>
          <button className={tab === 'subjects' ? 'active' : ''} onClick={() => subjects()}>
            Subjects
          </button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setView({ name: 'settings' })}>
            Settings
          </button>
        </nav>
      </header>
      <main>
        {view.name === 'home' && <Dashboard onReview={() => setView({ name: 'review' })} onStudy={study} onSubjects={subjects} />}
        {view.name === 'review' && <Review onExit={home} />}
        {view.name === 'subjects' && (
          <Subjects
            key={JSON.stringify(view.focus ?? {})}
            focus={view.focus}
            onStudy={study}
            onPractice={(skillId, level) => setView({ name: 'practice', skillId, level })}
          />
        )}
        {view.name === 'session' && <Session key={view.key} sessionKey={view.key} onExit={() => subjects(focusOfKey(view.key))} />}
        {view.name === 'practice' && (
          <Practice skillId={view.skillId} level={view.level} onExit={() => subjects({ section: view.skillId })} />
        )}
        {view.name === 'settings' && <Settings />}
      </main>
    </div>
  );
}
