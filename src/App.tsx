import { useEffect, useState } from 'react';
import { ChapterPage } from './ui/ChapterPage';
import { Chapters } from './ui/Chapters';
import { Dashboard } from './ui/Dashboard';
import { Practice } from './ui/Practice';
import { Review } from './ui/Review';
import { Session } from './ui/Session';
import { Settings } from './ui/Settings';
import { chapterOfKey } from './core/actions';
import { CHAPTER_OF } from './content';

type View =
  | { name: 'home' }
  | { name: 'review' }
  | { name: 'chapters' }
  | { name: 'chapter'; id: string; focus?: string }
  | { name: 'session'; key: string }
  | { name: 'practice'; skillId: string; level: number }
  | { name: 'settings' };

export function App() {
  const [view, setView] = useState<View>({ name: 'home' });
  const home = () => setView({ name: 'home' });
  const chapter = (id: string, focus?: string) => setView({ name: 'chapter', id, focus });
  const study = (key: string) => setView({ name: 'session', key });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const tab =
    view.name === 'home' || view.name === 'review'
      ? 'home'
      : view.name === 'settings'
        ? 'settings'
        : 'chapters';

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
          <button className={tab === 'chapters' ? 'active' : ''} onClick={() => setView({ name: 'chapters' })}>
            Chapters
          </button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setView({ name: 'settings' })}>
            Settings
          </button>
        </nav>
      </header>
      <main>
        {view.name === 'home' && <Dashboard onReview={() => setView({ name: 'review' })} onStudy={study} onChapter={chapter} />}
        {view.name === 'review' && <Review onExit={home} />}
        {view.name === 'chapters' && <Chapters onChapter={(id) => chapter(id)} />}
        {view.name === 'chapter' && (
          <ChapterPage
            key={view.id + (view.focus ?? '')}
            chapterId={view.id}
            focus={view.focus}
            onStudy={study}
            onPractice={(skillId, level) => setView({ name: 'practice', skillId, level })}
            onBack={() => setView({ name: 'chapters' })}
          />
        )}
        {view.name === 'session' && (
          <Session key={view.key} sessionKey={view.key} onExit={() => chapter(chapterOfKey(view.key).id)} />
        )}
        {view.name === 'practice' && (
          <Practice skillId={view.skillId} level={view.level} onExit={() => chapter(CHAPTER_OF[view.skillId].id, view.skillId)} />
        )}
        {view.name === 'settings' && <Settings />}
      </main>
    </div>
  );
}
