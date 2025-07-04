"use client"

import { useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { suggestChecklist } from "@/ai/flows/checklist-suggestions"
import { SuggestChecklistInputSchema, type SuggestChecklistInput, type SuggestChecklistOutput } from "@/lib/schemas"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Wand2, CheckSquare } from "lucide-react"

const issueTypes = [
  { value: "pest infestation", label: "Pest Infestation" },
  { value: "equipment malfunction", label: "Equipment Malfunction" },
  { value: "irrigation problem", label: "Irrigation Problem" },
  { value: "soil degradation", label: "Soil Degradation" },
  { value: "other", label: "Other Issue" },
]

export default function ChecklistBuilderClient() {
  const [suggestions, setSuggestions] = useState<SuggestChecklistOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<SuggestChecklistInput>({
    resolver: zodResolver(SuggestChecklistInputSchema),
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
              <CardDescription>Select the type of issue you are facing to get a suggested checklist.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="issueType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an issue type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {issueTypes.map((type) => (
                           <SelectItem key={type.value} value={type.value}>
                             {type.label}
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <div className="space-y-2">
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
              Here are the recommended steps to address the selected issue.
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
