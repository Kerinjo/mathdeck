import { useEffect, useState } from 'react';
import { Dashboard } from './ui/Dashboard';
import { Review } from './ui/Review';
import { Settings } from './ui/Settings';
import { Practice, Skills } from './ui/Skills';

type View =
  | { name: 'home' }
  | { name: 'review' }
  | { name: 'skills'; focus?: string }
  | { name: 'practice'; skillId: string; level: number }
  | { name: 'settings' };

export function App() {
  const [view, setView] = useState<View>({ name: 'home' });
  const home = () => setView({ name: 'home' });

  useEffect(() => {
    window.scrollTo(0, 0);
    if (view.name !== 'home') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
        setView({ name: 'review' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view]);

  const tab = view.name === 'practice' ? 'skills' : view.name;

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={home}>
          <span className="sigma">∑</span> mathdeck
        </button>
        <nav>
          <button className={tab === 'home' || tab === 'review' ? 'active' : ''} onClick={home}>
            Today
          </button>
          <button className={tab === 'skills' ? 'active' : ''} onClick={() => setView({ name: 'skills' })}>
            Skills
          </button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setView({ name: 'settings' })}>
            Settings
          </button>
        </nav>
      </header>
      <main>
        {view.name === 'home' && (
          <Dashboard onReview={() => setView({ name: 'review' })} onSkill={(id) => setView({ name: 'skills', focus: id })} />
        )}
        {view.name === 'review' && <Review onExit={home} />}
        {view.name === 'skills' && (
          <Skills key={view.focus} focus={view.focus} onPractice={(skillId, level) => setView({ name: 'practice', skillId, level })} />
        )}
        {view.name === 'practice' && (
          <Practice skillId={view.skillId} level={view.level} onExit={() => setView({ name: 'skills', focus: view.skillId })} />
        )}
        {view.name === 'settings' && <Settings />}
      </main>
    </div>
  );
}
