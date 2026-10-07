import { SearchScreen } from './SearchScreen.tsx';

export function App() {
  return (
    <>
      <header className="app-header">
        <h1 className="app-header__title">Mercadonapp</h1>
      </header>
      <main className="app-main">
        <SearchScreen />
      </main>
    </>
  );
}

