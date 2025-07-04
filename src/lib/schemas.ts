import { z } from 'zod';

// --- User Schemas ---

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string(),
  companyId: z.string(),
  role: z.enum(['Project Manager', 'Member', 'Accountant']),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const CreateUserOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  user: z.object({
      uid: z.string(),
      email: z.string(),
      displayName: z.string()
  }).optional(),
});
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;


// --- Project Schemas ---

export const CreateProjectInputSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  status: z.enum(["Planning", "In Progress", "On Hold", "Completed", "Delayed"]),
  team: z.array(z.string()).min(1, "At least one team member is required."),
  companyId: z.string(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;


// --- Resource Schemas ---

export const CreateResourceInputSchema = z.object({
  name: z.string().min(1, "Resource name is required."),
  category: z.enum(["Inputs", "Equipment", "Infrastructure", "Finance"]),
  quantity: z.string().min(1, "Quantity or value is required."),
  status: z.enum(["In Stock", "Good", "In Use", "On Track", "Low Stock", "Needs Maintenance"]),
  companyId: z.string(),
});

export type CreateResourceInput = z.infer<typeof CreateResourceInputSchema>;
