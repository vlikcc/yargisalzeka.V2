import { createContext, useReducer, useContext, ReactNode, useCallback } from 'react';
import { searchService } from '../services/searchService';

interface ResultItem { id: string; title: string; score: number; court?: string; summary?: string; createdAt?: string; }
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
    try {
      const h = await searchService.getHistory();
      const list: ResultItem[] = h.map(it => {
        // Keywords'lerden ilk 3 tanesini al ve title oluştur
        const keywordSummary = it.keywords.length > 0 
          ? it.keywords.slice(0, 3).join(', ') + (it.keywords.length > 3 ? '...' : '')
          : 'Anahtar kelime yok';
        
        return {
          id: it.id.toString(),
          title: keywordSummary,
          score: it.resultCount,
          summary: it.keywords.length > 0 
            ? `Anahtar Kelimeler: ${it.keywords.join(', ')}`
            : 'Bu arama için anahtar kelime bulunamadı',
          court: `${it.resultCount} sonuç`,
          createdAt: it.createdAt
        };
      });
      dispatch({ type: 'HISTORY_SET', payload: list });
    } catch (error) {
      console.error('Geçmiş yüklenirken hata:', error);
      dispatch({ type: 'HISTORY_SET', payload: [] });
    }
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
