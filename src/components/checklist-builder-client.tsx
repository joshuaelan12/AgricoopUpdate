"use client"

import { useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { suggestChecklist } from "@/ai/flows/checklist-suggestions"
import { SuggestChecklistInputSchema, type SuggestChecklistInput, type SuggestChecklistOutput } from "@/lib/schemas"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Wand2, CheckSquare } from "lucide-react"

export default function ChecklistBuilderClient() {
  const [suggestions, setSuggestions] = useState<SuggestChecklistOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<SuggestChecklistInput>({
    resolver: zodResolver(SuggestChecklistInputSchema),
    defaultValues: {
      issueDescription: "",
    },
  })

  const onSubmit: SubmitHandler<SuggestChecklistInput> = async (data) => {
    setIsLoading(true)
    setSuggestions(null)
    try {
      const result = await suggestChecklist(data)
      setSuggestions(result)
    } catch (error) {
      console.error("Error generating checklist:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate checklist suggestions. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Describe the Issue</CardTitle>
              <CardDescription>Describe the problem you are facing in detail, and our AI will generate a suggested action plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="issueDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Description</FormLabel>
                    <FormControl>
                        <Textarea
                            placeholder="e.g., 'Half of the corn stalks in the north field are yellowing and stunted, and I've noticed small white flies on the underside of the leaves.'"
                            className="resize-none"
                            rows={4}
                            {...field}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Suggestions
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {isLoading && (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Suggested Action Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Analyzing issue and generating checklist...</span>
                </div>
                <div className="space-y-2 pt-4">
                    <div className="h-6 bg-muted rounded-md animate-pulse w-3/4"></div>
                    <div className="h-6 bg-muted rounded-md animate-pulse w-1/2"></div>
                    <div className="h-6 bg-muted rounded-md animate-pulse w-5/6"></div>
                </div>
            </CardContent>
         </Card>
      )}

      {suggestions && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Suggested Action Plan</CardTitle>
            <CardDescription>
              Here are the AI-recommended steps to address the issue you described.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {suggestions.actionItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                    <CheckSquare className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
