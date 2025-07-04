'use server';

import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';

const SearchInputSchema = z.object({
  query: z.string(),
  companyId: z.string(),
});

interface ProjectResult {
    id: string;
    title: string;
    type: 'project';
    url: '/projects';
}

interface MemberResult {
    id:string;
    name: string;
    type: 'member';
    url: '/members';
}

interface ResourceResult {
    id: string;
    name: string;
    type: 'resource';
    url: '/resources';
}

export interface SearchResults {
    projects: ProjectResult[];
    members: MemberResult[];
    resources: ResourceResult[];
}

export async function globalSearch(input: { query: string; companyId: string }): Promise<SearchResults> {
    try {
        const { query, companyId } = SearchInputSchema.parse(input);

        if (!query.trim()) {
            return { projects: [], members: [], resources: [] };
        }

        const searchQuery = query.toLowerCase();

        // This is a simplified search that filters in-memory.
        // For production apps with large datasets, a dedicated search service like Algolia or Typesense is recommended.
        const projectsRef = adminDb.collection('projects').where('companyId', '==', companyId);
        const usersRef = adminDb.collection('users').where('companyId', '==', companyId);
        const resourcesRef = adminDb.collection('resources').where('companyId', '==', companyId);

        const [projectsSnap, usersSnap, resourcesSnap] = await Promise.all([
            projectsRef.get(),
            usersRef.get(),
            resourcesRef.get(),
        ]);

        const projects = projectsSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => p.title?.toLowerCase().includes(searchQuery))
            .map(p => ({
                id: p.id,
                title: p.title,
                type: 'project' as const,
                url: '/projects' as const,
            })).slice(0, 5); // Limit results

        const members = usersSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(u => u.displayName?.toLowerCase().includes(searchQuery))
            .map(u => ({
                id: u.id,
                name: u.displayName,
                type: 'member' as const,
                url: '/members' as const,
            })).slice(0, 5);

        const resources = resourcesSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(r => r.name?.toLowerCase().includes(searchQuery))
            .map(r => ({
                id: r.id,
                name: r.name,
                type: 'resource' as const,
                url: '/resources' as const,
            })).slice(0, 5);

        return { projects, members, resources };

    } catch (error) {
        console.error("Error in globalSearch:", error);
        return { projects: [], members: [], resources: [] };
    }
}
