import ChecklistBuilderClient from '@/components/checklist-builder-client';

export default function ChecklistBuilderPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-headline text-foreground">AI Checklist Builder</h1>
        <p className="text-muted-foreground">
          Describe an issue and get an AI-generated action plan to resolve it.
        </p>
      </div>
      <ChecklistBuilderClient />
    </div>
  );
}
