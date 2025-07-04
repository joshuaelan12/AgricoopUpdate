'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { globalSearch, type SearchResults } from '@/lib/actions/search.actions';

import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, FolderKanban, Users, Package } from 'lucide-react';

export default function GlobalSearch() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    setLoading(true);

    const timer = setTimeout(async () => {
      if (query.trim().length > 1 && user?.companyId) {
        const searchResults = await globalSearch({ query: query.trim(), companyId: user.companyId });
        setResults(searchResults);
      }
      setLoading(false);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [query, user?.companyId]);

  // Keyboard shortcut to focus search (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        containerRef.current?.querySelector('input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Close popover on outside click and route change
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    setIsOpen(false); // Close on route change
    setQuery(''); // Clear query on route change

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pathname]);

  const handleSelect = (url: string) => {
    router.push(url);
    setIsOpen(false);
    setQuery('');
  };

  const hasResults = results && (results.projects.length > 0 || results.members.length > 0 || results.resources.length > 0);

  return (
    <div className="relative ml-auto flex-1 md:grow-0" ref={containerRef}>
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
            type="search"
            placeholder="Search... (⌘K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
        />

      {isOpen && (
        <div className="absolute top-full mt-2 w-full rounded-lg border bg-popover text-popover-foreground shadow-md z-50 md:w-[200px] lg:w-[320px]">
          <div className="p-1 max-h-80 overflow-y-auto">
            {loading && (
              <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Searching...</span>
              </div>
            )}
            {!loading && !hasResults && (
              <p className="p-4 text-center text-sm text-muted-foreground">No results found.</p>
            )}

            {results?.projects.length > 0 && (
              <div className="space-y-0.5">
                <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Projects</p>
                {results.projects.map(project => (
                    <button key={project.id} onClick={() => handleSelect(project.url)} className="w-full text-left flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground">
                      <FolderKanban className="h-4 w-4" />
                      <span>{project.title}</span>
                    </button>
                ))}
              </div>
            )}
            
            {results?.members.length > 0 && (
              <div className="space-y-0.5">
                 {hasResults && results.projects.length > 0 && <Separator className="my-1" />}
                <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Members</p>
                {results.members.map(member => (
                    <button key={member.id} onClick={() => handleSelect(member.url)} className="w-full text-left flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground">
                      <Users className="h-4 w-4" />
                      <span>{member.name}</span>
                    </button>
                ))}
              </div>
            )}
            
            {results?.resources.length > 0 && (
               <div className="space-y-0.5">
                {(results.projects.length > 0 || results.members.length > 0) && <Separator className="my-1" />}
                <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Resources</p>
                {results.resources.map(resource => (
                    <button key={resource.id} onClick={() => handleSelect(resource.url)} className="w-full text-left flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground">
                      <Package className="h-4 w-4" />
                      <span>{resource.name}</span>
                    </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
