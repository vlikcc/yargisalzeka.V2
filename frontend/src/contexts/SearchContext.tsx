import { createContext, useReducer, useContext, ReactNode, useCallback } from 'react';
import { searchService } from '../services/searchService';

interface ResultItem { id: string; title: string; score: number; court?: string; summary?: string; }
interface State { results: ResultItem[]; history: ResultItem[]; loading: boolean; error: string | null; }
type Action =
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_SUCCESS'; payload: ResultItem[] }
  | { type: 'SEARCH_ERROR'; payload: string }
  | { type: 'HISTORY_SET'; payload: ResultItem[] };

const initial: State = { results: [], history: [], loading: false, error: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SEARCH_START':
      return { ...state, loading: true, error: null };
    case 'SEARCH_SUCCESS':
      return { ...state, loading: false, results: action.payload };
    case 'SEARCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'HISTORY_SET':
      return { ...state, history: action.payload };
    default:
      return state;
  }
}

interface Ctx extends State { loadHistory: () => Promise<void>; }
const SearchContext = createContext<Ctx | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const loadHistory = useCallback(async () => {
    const h = await searchService.getHistory();
    const list: ResultItem[] = h.map(it => ({ id: it.id, title: it.id, score: 0, summary: it.analysis.summary }));
    dispatch({ type: 'HISTORY_SET', payload: list });
  }, []);

  return (
  <SearchContext.Provider value={{ ...state, loadHistory }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be inside provider');
  return ctx;
}
