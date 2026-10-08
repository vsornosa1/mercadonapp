import { Icon } from './icons.tsx';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="search-bar">
      <div className="search-bar__field">
        <Icon name="search" size={18} className="search-bar__icon" />
        <label className="visually-hidden" htmlFor="product-search">
          Buscar producto
        </label>
        <input
          id="product-search"
          className="search-bar__input"
          type="search"
          inputMode="search"
          placeholder="Busca un producto"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
