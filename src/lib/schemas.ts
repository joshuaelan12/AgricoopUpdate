import { z } from 'zod';

// --- Base Data Interfaces (for use in components) ---

export const FileSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  uploaderName: z.string(),
  uploadedAt: z.date(),
});
export type ProjectFile = z.infer<typeof FileSchema>;

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

export const TaskStatusSchema = z.enum(['To Do', 'In Progress', 'Completed']);
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Task title is required."),
  assignedTo: z.array(z.string()),
  deadline: z.date().nullable(),
  status: TaskStatusSchema,
  files: z.array(FileSchema).optional(),
});
export type Task = z.infer<typeof TaskSchema>;


export interface Project {
  id: string;
  title: string;
  status: "In Progress" | "On Hold" | "Completed" | "Planning" | "Delayed";
  description: string;
  progress: number;
  team: string[]; // Array of user UIDs
  companyId: string;
  comments: Comment[];
  tasks: Task[];
  files: ProjectFile[];
  priority?: 'Low' | 'Medium' | 'High';
  deadline?: Date | null;
  estimatedBudget?: number;
}

export interface UserData {
  uid: string;
  displayName: string;
}

// --- User Schemas ---
export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1, "Display name is required."),
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
const ProjectCoreSchema = {
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  status: z.enum(["Planning", "In Progress", "On Hold", "Completed", "Delayed"]),
  priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  deadline: z.date().nullable().optional(),
  estimatedBudget: z.coerce.number().min(0, "Budget must be a positive number.").optional(),
};

export const CreateProjectInputSchema = z.object({
  ...ProjectCoreSchema,
  companyId: z.string(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

export const UpdateProjectInputSchema = z.object({
  projectId: z.string(),
  ...ProjectCoreSchema,
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;

export const DeleteProjectInputSchema = z.object({
  projectId: z.string(),
});
export type DeleteProjectInput = z.infer<typeof DeleteProjectInputSchema>;


// --- Task Schemas ---
export const AddTaskInputSchema = z.object({
  projectId: z.string(),
  title: z.string().min(3, "Task title must be at least 3 characters."),
  assignedTo: z.array(z.string()).min(1, "Assign task to at least one member."),
  deadline: z.date().nullable().optional(),
});
export type AddTaskInput = z.infer<typeof AddTaskInputSchema>;

export const UpdateTaskInputSchema = z.object({
  projectId: z.string(),
  taskId: z.string(),
  title: z.string().min(3, "Task title must be at least 3 characters.").optional(),
  assignedTo: z.array(z.string()).min(1, "Assign task to at least one member.").optional(),
  deadline: z.date().nullable().optional(),
  status: TaskStatusSchema.optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

export const DeleteTaskInputSchema = z.object({
  projectId: z.string(),
  taskId: z.string(),
});
export type DeleteTaskInput = z.infer<typeof DeleteTaskInputSchema>;


// --- Comment Schemas ---
export const AddProjectCommentInputSchema = z.object({
  projectId: z.string(),
  commentText: z.string().min(1, "Comment cannot be empty."),
  userId: z.string(),
  userName: z.string(),
});
export type AddProjectCommentInput = z.infer<typeof AddProjectCommentInputSchema>;

export const DeleteProjectCommentInputSchema = z.object({
  projectId: z.string(),
  commentId: z.string(),
  userId: z.string(),
});
export type DeleteProjectCommentInput = z.infer<typeof DeleteProjectCommentInputSchema>;


// --- Project Output Schemas ---
export const ProjectOutputSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().positive("Quantity must be a positive number."),
  unit: z.string().min(1, "Unit is required."),
  date: z.date(),
});
export type ProjectOutput = z.infer<typeof ProjectOutputSchema>;

export const AddProjectOutputInputSchema = z.object({
  projectId: z.string(),
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().positive("Quantity must be a positive number."),
  unit: z.string().min(1, "Unit is required."),
});
export type AddProjectOutputInput = z.infer<typeof AddProjectOutputInputSchema>;

export const DeleteProjectOutputInputSchema = z.object({
    projectId: z.string(),
    outputId: z.string(),
});
export type DeleteProjectOutputInput = z.infer<typeof DeleteProjectOutputInputSchema>;


// --- Resource Schemas ---
export const CreateResourceInputSchema = z.object({
  name: z.string().min(1, "Resource name is required."),
  category: z.enum(["Inputs", "Equipment", "Infrastructure", "Finance"]),
  quantity: z.coerce.number({ invalid_type_error: "Quantity must be a number."}).min(0, "Quantity cannot be negative."),
  status: z.enum(["In Stock", "Good", "In Use", "On Track", "Low Stock", "Needs Maintenance"]),
  companyId: z.string(),
});
export type CreateResourceInput = z.infer<typeof CreateResourceInputSchema>;

export const UpdateResourceInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Resource name is required."),
  category: z.enum(["Inputs", "Equipment", "Infrastructure", "Finance"]),
  quantity: z.coerce.number({ invalid_type_error: "Quantity must be a number."}).min(0, "Quantity cannot be negative."),
  status: z.enum(["In Stock", "Good", "In Use", "On Track", "Low Stock", "Needs Maintenance"]),
});
export type UpdateResourceInput = z.infer<typeof UpdateResourceInputSchema>;


// --- Auth Schemas ---
export const SignUpUserInputSchema = z.object({
  fullName: z.string().min(1, "Your full name is required."),
  companyName: z.string().min(1, "Company name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});
export type SignUpUserInput = z.infer<typeof SignUpUserInputSchema>;

export const SignUpUserOutputSchema = z.object({
    success: z.boolean(),
    error: z.string().optional(),
});
export type SignUpUserOutput = z.infer<typeof SignUpUserOutputSchema>;


// --- AI Checklist Schemas ---
export const SuggestChecklistInputSchema = z.object({
  issueDescription: z.string().min(10, {
    message: "Please describe the issue in at least 10 characters.",
  }).describe('A description of the issue that needs a checklist.'),
});
export type SuggestChecklistInput = z.infer<typeof SuggestChecklistInputSchema>;

export const SuggestChecklistOutputSchema = z.object({
  actionItems: z
    .array(z.string())
    .describe('A list of suggested action items for the checklist.'),
});
export type SuggestChecklistOutput = z.infer<typeof SuggestChecklistOutputSchema>;


// --- Resource Allocation Schemas ---
export const AllocatedResourceSchema = z.object({
  resourceId: z.string(),
  name: z.string(),
  quantity: z.number(),
});
export type AllocatedResource = z.infer<typeof AllocatedResourceSchema>;

export const AllocateResourceInputSchema = z.object({
  projectId: z.string(),
  resourceId: z.string(),
  quantity: z.coerce.number().positive("Quantity must be a positive number."),
});
export type AllocateResourceInput = z.infer<typeof AllocateResourceInputSchema>;

export const DeallocateResourceInputSchema = z.object({
  projectId: z.string(),
  resourceId: z.string(),
});
export type DeallocateResourceInput = z.infer<typeof DeallocateResourceInputSchema>;


// --- File Schemas ---
const FileInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
});

export const AddFileToProjectInputSchema = z.object({
  projectId: z.string(),
  file: FileInputSchema,
  uploaderName: z.string(),
});
export type AddFileToProjectInput = z.infer<typeof AddFileToProjectInputSchema>;

export const DeleteFileFromProjectInputSchema = z.object({
  projectId: z.string(),
  fileId: z.string(),
});
export type DeleteFileFromProjectInput = z.infer<typeof DeleteFileFromProjectInputSchema>;


export const AddFileToTaskInputSchema = z.object({
  projectId: z.string(),
  taskId: z.string(),
  file: FileInputSchema,
  uploaderName: z.string(),
});
export type AddFileToTaskInput = z.infer<typeof AddFileToTaskInputSchema>;

export const DeleteFileFromTaskInputSchema = z.object({
  projectId: z.string(),
  taskId: z.string(),
  fileId: z.string(),
});
export type DeleteFileFromTaskInput = z.infer<typeof DeleteFileFromTaskInputSchema>;
